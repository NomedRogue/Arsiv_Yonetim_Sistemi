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
  getDashboardStats(filters = {}) {
    try {
      const { treemapFilter = 'all', yearFilter = 'last12' } = filters;
      
      const folders = this.repos.folder.getAll();
      const checkouts = this.repos.checkout.getAll();
      const disposals = this.repos.disposal.getAll();
      const settings = this.repos.config.get('settings') || {};
      const storageStructure = this.repos.config.get('storageStructure') || { kompakt: [], stand: [] };
      const departments = this.repos.config.get('departments') || [];
      
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Department map
      const departmentMap = new Map(departments.map(d => [d.id, d]));
      
      // Basic counts
      const toplamKlasor = folders.length;
      const arsivde = folders.filter(f => f.status === 'Arşivde').length;
      const arsivDisinda = folders.filter(f => f.status === 'Çıkışta').length;
      const imhaEdilen = folders.filter(f => f.status === 'İmha').length;
      
      // Checkout stats
      const activeCheckouts = checkouts.filter(c => c.status === 'Çıkışta');
      const iadeGeciken = activeCheckouts.filter(c => new Date(c.plannedReturnDate) < now).length;
      
      // Disposal stats (imha)
      const buYilImhaEdilenecek = folders.filter(f => 
        f.status !== 'İmha' && 
        (f.fileYear + f.retentionPeriod + 1) === currentYear
      ).length;
      
      const gelecekYilImhaEdilenecek = folders.filter(f => 
        f.status !== 'İmha' && 
        (f.fileYear + f.retentionPeriod + 1) === currentYear + 1
      ).length;
      
      const imhaSuresiGecen = folders.filter(f => 
        f.status !== 'İmha' && 
        (f.fileYear + f.retentionPeriod + 1) < currentYear
      ).length;
      
      // Occupancy calculation
      const occupancy = this.calculateOccupancy(folders, storageStructure, settings);
      
      // Treemap data
      const treemapData = this.calculateTreemapData(folders, departmentMap, treemapFilter, storageStructure, settings);
      
      // Clinic distribution (for medical folders)
      const clinicDistribution = this.calculateClinicDistribution(folders);
      
      // Monthly trend data
      const monthlyTrend = this.calculateMonthlyTrend(folders, yearFilter);
      
      // Disposal schedule (next 5 years + overdue)
      const disposalSchedule = this.calculateDisposalSchedule(folders, currentYear);
      
      // Available years
      const availableYears = [...new Set(folders.map(f => f.fileYear))].sort((a, b) => b - a);
      
      // Category counts
      const tibbiCount = folders.filter(f => f.category === 'Tıbbi' && f.status !== 'İmha').length;
      const idariCount = folders.filter(f => f.category === 'İdari' && f.status !== 'İmha').length;
      
      logger.info('[STATS_SERVICE] Dashboard stats calculated:', {
        toplamKlasor,
        arsivde,
        arsivDisinda,
        occupancyPercent: occupancy.percentage.toFixed(1)
      });
      
      // Return with frontend-compatible field names
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
   * Calculate overall occupancy
   */
  calculateOccupancy(folders, storageStructure, settings) {
    const darW = settings.darKlasorGenisligi || 3;
    const genisW = settings.genisKlasorGenisligi || 5;
    const kompaktShelfW = settings.kompaktRafGenisligi || 100;
    const standShelfW = settings.standRafGenisligi || 120;
    
    // Calculate total space
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
    
    // Calculate used space (exclude disposed folders)
    const foldersForOccupancy = folders.filter(f => f.status !== 'İmha');
    const usedSpace = foldersForOccupancy.reduce((sum, f) => 
      sum + (f.folderType === 'Dar' ? darW : genisW), 0
    );
    
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
   * Calculate treemap data for space visualization
   */
  calculateTreemapData(folders, departmentMap, filter, storageStructure, settings) {
    const darW = settings.darKlasorGenisligi || 3;
    const genisW = settings.genisKlasorGenisligi || 5;
    const kompaktShelfW = settings.kompaktRafGenisligi || 100;
    const standShelfW = settings.standRafGenisligi || 120;
    
    // Filter folders
    let filteredFolders = folders.filter(f => f.status !== 'İmha');
    if (filter && filter !== 'all') {
      filteredFolders = filteredFolders.filter(f => f.location?.storageType === filter);
    }
    
    // Group by department and folder type
    const grouped = {};
    
    for (const folder of filteredFolders) {
      const dept = departmentMap.get(folder.departmentId);
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
      
      const width = folder.folderType === 'Dar' ? darW : genisW;
      grouped[dept.category].children[dept.name].size += width;
      grouped[dept.category].children[dept.name].folderCount += 1;
    }
    
    // Calculate total capacity for filter
    let totalCapacity = 0;
    if (filter === 'Kompakt') {
      totalCapacity = (storageStructure.kompakt || []).reduce((sum, unit) => 
        sum + unit.faces.reduce((faceSum, face) => 
          faceSum + face.sections.reduce((secSum, sec) => 
            secSum + sec.shelves.length * kompaktShelfW, 0
          ), 0
        ), 0
      );
    } else if (filter === 'Stand') {
      totalCapacity = (storageStructure.stand || []).reduce((sum, stand) => 
        sum + stand.shelves.length * standShelfW, 0
      );
    } else {
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
    }
    
    // Format for treemap - her kategori içinde yüzdeye göre büyükten küçüğe sırala
    // Böylece index=0 en yüksek doluluk (koyu), index=n en düşük doluluk (açık) olur
    return Object.values(grouped).map(category => {
      const childrenWithPercentage = Object.values(category.children).map(child => ({
        ...child,
        percentage: totalCapacity > 0 ? (child.size / totalCapacity) * 100 : 0,
        category: category.name
      }));
      
      // Yüzdeye göre büyükten küçüğe sırala
      childrenWithPercentage.sort((a, b) => b.percentage - a.percentage);
      
      return {
        name: category.name,
        children: childrenWithPercentage
      };
    });
  }

  /**
   * Calculate clinic distribution (for medical folders)
   */
  calculateClinicDistribution(folders) {
    const clinicCounts = {};
    
    folders
      .filter(f => f.category === 'Tıbbi' && f.status !== 'İmha' && f.clinic)
      .forEach(f => {
        if (!clinicCounts[f.clinic]) {
          clinicCounts[f.clinic] = 0;
        }
        clinicCounts[f.clinic]++;
      });
    
    return Object.entries(clinicCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Calculate disposal schedule for next 5 years + overdue
   */
  calculateDisposalSchedule(folders, currentYear) {
    const schedule = [];
    
    // Calculate overdue (folders that should have been disposed)
    const overdueFolders = folders.filter(f => 
      f.status !== 'İmha' && 
      (f.fileYear + f.retentionPeriod + 1) < currentYear
    );
    
    if (overdueFolders.length > 0) {
      schedule.push({
        year: currentYear - 1,
        label: 'Gecikmiş',
        count: overdueFolders.length,
        isCurrentYear: false,
        isOverdue: true
      });
    }
    
    // Calculate for current year and next 4 years (5 years total)
    for (let i = 0; i < 5; i++) {
      const targetYear = currentYear + i;
      const count = folders.filter(f => 
        f.status !== 'İmha' && 
        (f.fileYear + f.retentionPeriod + 1) === targetYear
      ).length;
      
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
   * Calculate monthly trend data
   */
  calculateMonthlyTrend(folders, yearFilter) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const availableYears = [...new Set(folders.map(f => f.fileYear))];
    
    if (yearFilter === 'last12' || !availableYears.includes(Number(yearFilter))) {
      // Last 12 months
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
    } else {
      // Specific year
      const year = Number(yearFilter);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }
    
    // Generate monthly buckets
    const months = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth(),
        date: new Date(current)
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    // Count folders created in each month
    return months.map(m => {
      const monthStart = new Date(m.year, m.month, 1);
      const monthEnd = new Date(m.year, m.month + 1, 0, 23, 59, 59);
      
      const count = folders.filter(f => {
        const created = new Date(f.createdAt);
        return created >= monthStart && created <= monthEnd;
      }).length;
      
      return {
        month: m.date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
        count
      };
    });
  }

  /**
   * Get folders for a specific disposal year
   */
  getDisposalYearFolders(targetYear, isOverdue = false) {
    const folders = this.repos.folder.getAll();
    const departments = this.repos.config.get('departments') || [];
    const departmentMap = new Map(departments.map(d => [d.id, d.name]));
    const currentYear = new Date().getFullYear();
    
    let filteredFolders;
    
    if (isOverdue) {
      // Süresi geçmiş klasörler
      filteredFolders = folders.filter(f => 
        f.status !== 'İmha' && 
        (f.fileYear + f.retentionPeriod + 1) < currentYear
      );
    } else {
      // Belirli yılda imha edilecek klasörler
      filteredFolders = folders.filter(f => 
        f.status !== 'İmha' && 
        (f.fileYear + f.retentionPeriod + 1) === targetYear
      );
    }
    
    // Departman isimlerini ekle
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
