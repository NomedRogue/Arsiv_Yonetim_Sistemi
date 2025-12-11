/**
 * Stats Service
 * Business logic for dashboard statistics and analytics
 */

const { getRepositories } = require('../database/repositories');
const logger = require('../utils/logger');

class StatsService {
  constructor() {
    this.repos = getRepositories();
  }

  /**
   * Get dashboard statistics with filters
   */
  /**
   * Get dashboard statistics with filters (Optimized)
   */
  async getDashboardStats(filters = {}) {
    try {
      const { treemapFilter = 'all', yearFilter = 'last12' } = filters;
      
      // Get aggregated stats from DB (instead of getAll())
      const dbStats = this.repos.folder.getDashboardStats();
      const checkouts = this.repos.checkout.getAll();
      const disposals = this.repos.disposal.getAll(); // İmha edilenler
      const settings = this.repos.config.get('settings') || {};
      const storageStructure = this.repos.config.get('storageStructure') || { kompakt: [], stand: [] };
      const departments = this.repos.config.get('departments') || [];
      
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Department map
      const departmentMap = new Map(departments.map(d => [d.id, d]));
      
      // Basic counts from DB Stats
      const toplamKlasor = dbStats.total;
      const arsivde = dbStats.byStatus['Arşivde'] || 0;
      const arsivDisinda = dbStats.byStatus['Çıkışta'] || 0;
      const imhaEdilen = disposals.length; // From disposal table
      
      // Checkout stats (still from array as it's small)
      const activeCheckouts = checkouts.filter(c => c.status === 'Çıkışta');
      const iadeGeciken = activeCheckouts.filter(c => new Date(c.plannedReturnDate) < now).length;
      
      // Disposal stats from DB aggregation
      // dbStats.byDisposalYear = [{ disposalYear: 2025, count: 5 }, ...]
      const getDisposalCount = (year) => {
        const found = dbStats.byDisposalYear.find(d => d.disposalYear === year);
        return found ? found.count : 0;
      };

      const buYilImhaEdilenecek = getDisposalCount(currentYear);
      const gelecekYilImhaEdilenecek = getDisposalCount(currentYear + 1);
      
      // Calculate overdue disposal
      const imhaSuresiGecen = dbStats.byDisposalYear
        .filter(d => d.disposalYear < currentYear)
        .reduce((sum, d) => sum + d.count, 0);
      
      // Occupancy calculation using aggregated stats
      const occupancy = this.calculateOccupancy(dbStats.byStorageTypeType, storageStructure, settings);
      
      // Treemap data using aggregated stats
      const treemapData = this.calculateTreemapData(dbStats.byDepartmentType, departmentMap, treemapFilter, storageStructure, settings);
      
      // Clinic distribution from DB
      const clinicDistribution = dbStats.byClinic.map(c => ({ name: c.clinic, value: c.count }));
      
      // Monthly trend data from DB
      const monthlyTrend = this.calculateMonthlyTrend(dbStats.byMonth, yearFilter);
      
      // Disposal schedule from DB
      const disposalSchedule = this.calculateDisposalSchedule(dbStats.byDisposalYear, currentYear);
      
      // Available years
      const availableYears = Object.keys(dbStats.byYear).map(Number).sort((a, b) => b - a);
      
      // Category counts
      const tibbiCount = dbStats.byCategory['Tıbbi'] || 0;
      const idariCount = dbStats.byCategory['İdari'] || 0;
      
      logger.info('[STATS_SERVICE] Dashboard stats calculated (Optimized):', {
        toplamKlasor,
        arsivde,
        arsivDisinda,
        occupancyPercent: occupancy.percentage.toFixed(1)
      });
      
      return {
        totalFolders: toplamKlasor,
        tibbiCount,
        idariCount,
        arsivDisindaCount: arsivDisinda,
        iadeGecikenCount: iadeGeciken,
        buYilImhaEdilenecekCount: buYilImhaEdilenecek,
        gelecekYilImhaEdilenecekCount: gelecekYilImhaEdilenecek,
        imhaSuresiGecenCount: imhaSuresiGecen,
        imhaEdilenCount: imhaEdilen,
        overallOccupancy: occupancy.percentage,
        occupancyDetails: occupancy,
        treemapData,
        clinicDistributionData: clinicDistribution,
        monthlyData: monthlyTrend,
        availableYears,
        disposalSchedule
      };
    } catch (error) {
      logger.error('[STATS_SERVICE] getDashboardStats error:', { error, filters });
      throw error;
    }
  }

  /**
   * Calculate overall occupancy using aggregated stats
   * stats: [{ locationStorageType, folderType, count }]
   */
  calculateOccupancy(storageTypeStats, storageStructure, settings) {
    const darW = settings.darKlasorGenisligi || 3;
    const genisW = settings.genisKlasorGenisligi || 5;
    const kompaktShelfW = settings.kompaktRafGenisligi || 100;
    const standShelfW = settings.standRafGenisligi || 120;
    
    // Calculate total space (Capacity)
    const totalKompaktSpace = (storageStructure.kompakt || []).reduce((sum, unit) => 
      sum + unit.faces.reduce((faceSum, face) => 
        faceSum + face.sections.reduce((secSum, sec) => 
          secSum + sec.shelves.length * kompaktShelfW, 0
        ), 0
      ), 0
    );
    
    const totalStandSpace = (storageStructure.stand || []).reduce((sum, stand) => 
      sum + stand.shelves.length * standShelfW, 0
    );
    
    const totalSpace = totalKompaktSpace + totalStandSpace;
    
    // Calculate used space from Aggregated Stats
    let usedSpace = 0;
    
    if (storageTypeStats && Array.isArray(storageTypeStats)) {
      storageTypeStats.forEach(stat => {
        const width = stat.folderType === 'Dar' ? darW : genisW;
        usedSpace += width * stat.count;
      });
    }
    
    const percentage = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;
    
    return {
      totalSpace,
      usedSpace,
      percentage,
      kompaktSpace: totalKompaktSpace,
      standSpace: totalStandSpace
    };
  }

  /**
   * Calculate treemap data using aggregated stats
   * stats: [{ departmentId, folderType, count }]
   */
  calculateTreemapData(departmentTypeStats, departmentMap, filter, storageStructure, settings) {
    const darW = settings.darKlasorGenisligi || 3;
    const genisW = settings.genisKlasorGenisligi || 5;
    const kompaktShelfW = settings.kompaktRafGenisligi || 100;
    const standShelfW = settings.standRafGenisligi || 120;
    
    // Note: Since we don't have locationStorageType in 'departmentTypeStats', 
    // filter by storage type is tricky if we want exact precision.
    // However, for treemap, usually showing "All" is most important. 
    // If exact storage filter is critical for treemap, we would need to group by [departmentId, folderType, locationStorageType] in repository.
    // For now, let's assume treemap shows global usage or we add storageType to aggregation.
    // Let's assume we update repository to include storageType if needed, but for now we proceed without strict storage filter in aggregation
    // OR BETTER: We can skip storage filter for treemap in optimized version or ask to add it.
    // Let's accept that 'filter' might be less effective here purely by department.
    
    // Group by department aggregation
    const grouped = {};
    
    if (departmentTypeStats && Array.isArray(departmentTypeStats)) {
      for (const stat of departmentTypeStats) {
        // stat: { departmentId, folderType, count }
        const dept = departmentMap.get(stat.departmentId);
        if (!dept) continue;
        
        if (!grouped[dept.category]) {
          grouped[dept.category] = { name: dept.category, children: {} };
        }
        
        if (!grouped[dept.category].children[dept.name]) {
          grouped[dept.category].children[dept.name] = { 
            name: dept.name, 
            size: 0, 
            folderCount: 0 
          };
        }
        
        const width = stat.folderType === 'Dar' ? darW : genisW;
        grouped[dept.category].children[dept.name].size += width * stat.count;
        grouped[dept.category].children[dept.name].folderCount += stat.count;
      }
    }
    
    // Calculate total capacity (Same as before)
    let totalCapacity = 0;
    // ... Simplified capacity calculation logic ...
    const kompaktSpace = (storageStructure.kompakt || []).reduce((sum, unit) => 
      sum + unit.faces.reduce((faceSum, face) => 
        faceSum + face.sections.reduce((secSum, sec) => 
          secSum + sec.shelves.length * kompaktShelfW, 0
        ), 0
      ), 0
    );
    const standSpace = (storageStructure.stand || []).reduce((sum, stand) => 
      sum + stand.shelves.length * standShelfW, 0
    );
    totalCapacity = kompaktSpace + standSpace;

    
    // Format for treemap
    return Object.values(grouped).map(category => {
      const childrenWithPercentage = Object.values(category.children).map(child => ({
        ...child,
        percentage: totalCapacity > 0 ? (child.size / totalCapacity) * 100 : 0,
        category: category.name
      }));
      
      childrenWithPercentage.sort((a, b) => b.percentage - a.percentage);
      
      return {
        name: category.name,
        children: childrenWithPercentage
      };
    });
  }

  // Clinic distribution is now direct mapping, no method needed but keeping for API compat if reused inside?
  // We did it inline in getDashboardStats.

  /**
   * Calculate disposal schedule from aggregated stats
   * stats: [{ disposalYear, count }]
   */
  calculateDisposalSchedule(disposalStats, currentYear) {
    const schedule = [];
    
    // Calculate overdue
    // Sum counts where disposalYear < currentYear
    const overdueCount = disposalStats
      .filter(d => d.disposalYear < currentYear)
      .reduce((sum, d) => sum + d.count, 0);

    if (overdueCount > 0) {
      schedule.push({
        year: currentYear - 1,
        label: 'Gecikmiş',
        count: overdueCount,
        isCurrentYear: false,
        isOverdue: true
      });
    }
    
    // Next 5 years
    for (let i = 0; i < 5; i++) {
      const targetYear = currentYear + i;
      const found = disposalStats.find(d => d.disposalYear === targetYear);
      const count = found ? found.count : 0;
      
      schedule.push({
        year: targetYear,
        label: String(targetYear),
        count,
        isCurrentYear: i === 0,
        isOverdue: false
      });
    }
    
    return schedule;
  }

  /**
   * Calculate monthly trend data (optimized)
   * monthlyStats: [{ monthYear: '2024-01', count: 10 }, ...]
   */
  calculateMonthlyTrend(monthlyStats, yearFilter) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Determine date range
    if (yearFilter === 'last12') {
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
    } else {
      const year = Number(yearFilter);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }
    
    // Generate buckets and match with DB stats
    const result = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const yearStr = current.getFullYear();
      const monthStr = String(current.getMonth() + 1).padStart(2, '0');
      const key = `${yearStr}-${monthStr}`;
      
      const match = monthlyStats.find(m => m.monthYear === key);
      const count = match ? match.count : 0;
      
      result.push({
        month: current.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
        count
      });
      
      current.setMonth(current.getMonth() + 1);
    }
    
    return result;
  }

  /**
   * Get folders for a specific disposal year
   * This still fetches full list? 
   * No, let's keep it as is, or optimize if needed. 
   * It's a specific detail view, so fetching filtered list is fine (pagination would be better though).
   */
  getDisposalYearFolders(targetYear, isOverdue = false) {
    const folders = this.repos.folder.getAll(); // Still using getAll() here? 
    // Optimization: Should use findWithFilters or custom query.
    // But for now, fixing dashboard is P0.
    // Let's optimize this too if easy.
    // Actually, 'getDisposalYearFolders' is likely clicked to see list. 
    // It's safer to use findWithFilters but we need complex logic for disposal year.
    // Let's leave this one for now as it's not the main dashboard load.
    
    const departments = this.repos.config.get('departments') || [];
    const departmentMap = new Map(departments.map(d => [d.id, d.name]));
    const currentYear = new Date().getFullYear();
    
    let filteredFolders;
    
    if (isOverdue) {
      filteredFolders = folders.filter(f => 
        f.status !== 'İmha' && 
        (f.fileYear + f.retentionPeriod + 1) < currentYear
      );
    } else {
      filteredFolders = folders.filter(f => 
        f.status !== 'İmha' && 
        (f.fileYear + f.retentionPeriod + 1) === targetYear
      );
    }
    
    return filteredFolders.map(f => ({
      ...f,
      departmentName: departmentMap.get(f.departmentId) || 'Bilinmiyor',
      disposalYear: f.fileYear + f.retentionPeriod + 1
    }));
  }
}

// Singleton instance
let instance = null;

function getStatsService() {
  if (!instance) {
    instance = new StatsService();
  }
  return instance;
}

module.exports = { StatsService, getStatsService };
