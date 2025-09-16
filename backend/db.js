const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const { getUserDataPath } = require('./fileHelper');
const logger = require('./logger');
const { ALL_DEPARTMENTS: DEFAULT_DEPARTMENTS } = require('./constants');
const fs = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

const DB_FILE = process.env.DB_PATH || getUserDataPath('arsiv.db');
let dbInstance = null; // Lazy initialization

const SCHEMA_VERSION = 1;

function migrate(db) {
  db.pragma('journal_mode = WAL');
  
  const versionRow = db.prepare("SELECT value FROM configs WHERE key = 'schema_version'").get();
  const currentVersion = versionRow ? Number(JSON.parse(versionRow.value)) : 0;
  
  logger.info(`[DB] Mevcut şema versiyonu: ${currentVersion}, Hedef: ${SCHEMA_VERSION}`);

  if (currentVersion < 1) {
    logger.info('[DB MIGRATION] Versiyon 1 çalıştırılıyor: Klasörler için ayrı sütunlar oluşturuluyor.');
    
    const oldFoldersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='folders'").get();

    // Sadece eski tablo varsa ve yeni kolonları içermiyorsa migrate et
    if (oldFoldersTableExists) {
        const columns = db.prepare("PRAGMA table_info(folders)").all();
        const hasDataColumn = columns.some(c => c.name === 'data');
        
        if (hasDataColumn) {
            db.exec(`ALTER TABLE folders RENAME TO folders_old_json`);
            ensureTables(db); // Create new schema
            logger.info('[DB MIGRATION] folders tablosu `folders_old_json` olarak yeniden adlandırıldı.');

            const oldFolders = db.prepare('SELECT data FROM folders_old_json').all();
            const insertStmt = db.prepare(`
                INSERT INTO folders (
                    id, category, departmentId, clinic, unitCode, fileCode, subject, specialInfo, retentionPeriod, 
                    retentionCode, fileYear, fileCount, folderType, pdfPath, locationStorageType, locationUnit, 
                    locationFace, locationSection, locationShelf, locationStand, status, createdAt, updatedAt
                ) VALUES (
                    @id, @category, @departmentId, @clinic, @unitCode, @fileCode, @subject, @specialInfo, @retentionPeriod, 
                    @retentionCode, @fileYear, @fileCount, @folderType, @pdfPath, @locationStorageType, @locationUnit, 
                    @locationFace, @locationSection, @locationShelf, @locationStand, @status, @createdAt, @updatedAt
                )
            `);
            
            db.transaction(() => {
                for (const row of oldFolders) {
                    const data = JSON.parse(row.data);
                    insertStmt.run({
                        id: data.id,
                        category: data.category,
                        departmentId: data.departmentId,
                        clinic: data.clinic,
                        unitCode: data.unitCode,
                        fileCode: data.fileCode,
                        subject: data.subject,
                        specialInfo: data.specialInfo,
                        retentionPeriod: data.retentionPeriod,
                        retentionCode: data.retentionCode,
                        fileYear: data.fileYear,
                        fileCount: data.fileCount,
                        folderType: data.folderType,
                        pdfPath: data.pdfPath,
                        locationStorageType: data.location?.storageType,
                        locationUnit: data.location?.unit,
                        locationFace: data.location?.face,
                        locationSection: data.location?.section,
                        locationShelf: data.location?.shelf,
                        locationStand: data.location?.stand,
                        status: data.status,
                        createdAt: data.createdAt,
                        updatedAt: data.updatedAt
                    });
                }
            })();
            
            db.exec('DROP TABLE folders_old_json');
            logger.info('[DB MIGRATION] `folders` tablosu başarıyla yeni şemaya geçirildi.');
        }
    }
  }
  
  // Şema versiyonunu güncelle
  db.prepare("INSERT OR REPLACE INTO configs (key, value) VALUES ('schema_version', ?)")
    .run(JSON.stringify(SCHEMA_VERSION));
}

// Performans için index ekleme
function ensureIndexes(db) {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_folders_createdAt ON folders(createdAt);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_folders_subject ON folders(subject);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_folders_fileYear ON folders(fileYear);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_folders_departmentId ON folders(departmentId);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_folders_category ON folders(category);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_folders_status ON folders(status);`);
}

function ensureTables(db) {
  logger.info('[DB] Tablo yapısı kontrol ediliyor...');
  db.pragma('journal_mode = WAL');
  
  // Önce temel tabloları oluştur
  db.exec(`
    CREATE TABLE IF NOT EXISTS configs   ( key TEXT PRIMARY KEY, value TEXT );
    CREATE TABLE IF NOT EXISTS folders   ( 
      id TEXT PRIMARY KEY, category TEXT, departmentId INTEGER, clinic TEXT, unitCode TEXT, fileCode TEXT, subject TEXT, 
      specialInfo TEXT, retentionPeriod INTEGER, retentionCode TEXT, fileYear INTEGER, fileCount INTEGER, folderType TEXT,
      pdfPath TEXT, locationStorageType TEXT, locationUnit INTEGER, locationFace TEXT, locationSection INTEGER, 
      locationShelf INTEGER, locationStand INTEGER, status TEXT, createdAt TEXT, updatedAt TEXT 
    );
    CREATE TABLE IF NOT EXISTS checkouts ( id  TEXT PRIMARY KEY, data  TEXT );
    CREATE TABLE IF NOT EXISTS disposals ( id  TEXT PRIMARY KEY, data  TEXT );
    CREATE TABLE IF NOT EXISTS logs      ( id  TEXT PRIMARY KEY, data  TEXT );
  `);
  
  // Sonra migration'ı çalıştır
  migrate(db);
  
  // İndeksleri oluştur
  ensureIndexes(db);
  
  logger.info('[DB] Veritabanı şeması başarıyla kontrol edildi/güncellendi');
}

function rowToFolder(row) {
    if (!row) return null;
    const folder = {
        id: row.id,
        category: row.category,
        departmentId: row.departmentId,
        clinic: row.clinic,
        unitCode: row.unitCode,
        fileCode: row.fileCode,
        subject: row.subject,
        specialInfo: row.specialInfo,
        retentionPeriod: row.retentionPeriod,
        retentionCode: row.retentionCode,
        fileYear: row.fileYear,
        fileCount: row.fileCount,
        folderType: row.folderType,
        pdfPath: row.pdfPath,
        status: row.status,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        location: {
            storageType: row.locationStorageType,
            unit: row.locationUnit,
            face: row.locationFace,
            section: row.locationSection,
            shelf: row.locationShelf,
            stand: row.locationStand,
        }
    };
    // Null/undefined location fields are fine
    for (const key in folder.location) {
        if (folder.location[key] === null || folder.location[key] === undefined) {
            delete folder.location[key];
        }
    }
    return folder;
}

const dbManager = {
  migrate() {
    try {
        const db = this.getDbInstance(); // Bu zaten ensureTables'ı çağırıyor
        logger.info('[DB] Veritabanı başlatma işlemi tamamlandı');
    } catch (e) {
        logger.error('[MIGRATION FAILED]', { error: e });
        throw new Error('Veritabanı geçişi başarısız oldu. Uygulama başlatılamıyor.');
    }
  },

  getDbInstance() {
    if (!dbInstance || !dbInstance.open) {
      logger.info('Veritabanı bağlantısı kuruluyor...');
      
      // Database dosyasının bulunacağı klasörü oluştur
      const dbDir = path.dirname(DB_FILE);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.info(`Database klasörü oluşturuldu: ${dbDir}`);
      }
      
      logger.info(`Database dosya yolu: ${DB_FILE}`);
      dbInstance = new Database(DB_FILE);
      ensureTables(dbInstance);
      logger.info(`better-sqlite3 veritabanına bağlandı: ${DB_FILE}`);
    }
    return dbInstance;
  },

  DB_FILE,

  reconnectDb() {
    this.closeDb();
    this.getDbInstance();
    logger.info(`Veritabanı bağlantısı yeniden kuruldu: ${DB_FILE}`);
  },

  closeDb() {
    if (dbInstance && dbInstance.open) {
      logger.info('Veritabanı bağlantısı kapatılıyor...');
      dbInstance.close();
      dbInstance = null;
    }
  },

  getConfig(key) {
    try {
      const row = this.getDbInstance().prepare('SELECT value FROM configs WHERE key = ?').get(key);
      return row ? JSON.parse(row.value) : null;
    } catch (e) {
      logger.error('[GET CONFIG ERROR]', { error: e });
      return null;
    }
  },

  setConfig(key, value) {
    try {
      this.getDbInstance().prepare('INSERT OR REPLACE INTO configs (key, value) VALUES (?, ?)')
        .run(key, JSON.stringify(value));
      return true;
    } catch (e) {
      logger.error('[SET CONFIG ERROR]', { error: e });
      return false;
    }
  },

  getList(tableName) {
    return this.getDbInstance().prepare(`SELECT data FROM ${tableName}`).all().map(r => JSON.parse(r.data));
  },
  
  getById(tableName, id) {
    const row = this.getDbInstance().prepare(`SELECT data FROM ${tableName} WHERE id = ?`).get(String(id));
    return row ? JSON.parse(row.data) : null;
  },

  insert(tableName, item) {
    this.getDbInstance().prepare(`INSERT INTO ${tableName} (id, data) VALUES (?, ?)`).run(String(item.id), JSON.stringify(item));
    return item;
  },

  update(tableName, item) {
    this.getDbInstance().prepare(`UPDATE ${tableName} SET data = ? WHERE id = ?`).run(JSON.stringify(item), String(item.id));
    return item;
  },
  
  remove(tableName, id) {
     this.getDbInstance().prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(String(id));
     return { id };
  },

  addLog(logData) {
    try {
      const log = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ...logData
      };
      this.insert('logs', log);
      logger.info(`[LOG ADDED] ${log.type}: ${log.details}`);
    } catch (e) {
      logger.error('[ADD LOG ERROR]', { error: e });
    }
  },
  
  getFolderById(id) {
    const db = this.getDbInstance();
    const row = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    return rowToFolder(row);
  },
  
  insertFolder(folderData) {
      const db = this.getDbInstance();
      const id = String(folderData.id || crypto.randomUUID());
      const now = new Date().toISOString();
      
      const stmt = db.prepare(`
          INSERT INTO folders (
              id, category, departmentId, clinic, unitCode, fileCode, subject, specialInfo, 
              retentionPeriod, retentionCode, fileYear, fileCount, folderType, pdfPath, 
              locationStorageType, locationUnit, locationFace, locationSection, locationShelf, locationStand, 
              status, createdAt, updatedAt
          ) VALUES (
              @id, @category, @departmentId, @clinic, @unitCode, @fileCode, @subject, @specialInfo, 
              @retentionPeriod, @retentionCode, @fileYear, @fileCount, @folderType, @pdfPath, 
              @locationStorageType, @locationUnit, @locationFace, @locationSection, @locationShelf, @locationStand, 
              @status, @createdAt, @updatedAt
          )
      `);

      const newFolder = {
        ...folderData,
        id,
        status: folderData.status || 'Arşivde',
        createdAt: folderData.createdAt ? new Date(folderData.createdAt).toISOString() : now,
        updatedAt: now,
      };
      
      stmt.run({
          id: newFolder.id,
          category: newFolder.category,
          departmentId: newFolder.departmentId,
          clinic: newFolder.clinic || null,
          unitCode: newFolder.unitCode || null,
          fileCode: newFolder.fileCode,
          subject: newFolder.subject,
          specialInfo: newFolder.specialInfo || null,
          retentionPeriod: newFolder.retentionPeriod,
          retentionCode: newFolder.retentionCode,
          fileYear: newFolder.fileYear,
          fileCount: newFolder.fileCount,
          folderType: newFolder.folderType,
          pdfPath: newFolder.pdfPath || null,
          locationStorageType: newFolder.location?.storageType,
          locationUnit: newFolder.location?.unit || null,
          locationFace: newFolder.location?.face || null,
          locationSection: newFolder.location?.section || null,
          locationShelf: newFolder.location?.shelf || null,
          locationStand: newFolder.location?.stand || null,
          status: newFolder.status,
          createdAt: newFolder.createdAt,
          updatedAt: newFolder.updatedAt,
      });

      return this.getFolderById(id);
  },

  updateFolder(folderData) {
      const db = this.getDbInstance();
      const now = new Date().toISOString();
      
      const stmt = db.prepare(`
        UPDATE folders SET
          category = @category, departmentId = @departmentId, clinic = @clinic, unitCode = @unitCode,
          fileCode = @fileCode, subject = @subject, specialInfo = @specialInfo,
          retentionPeriod = @retentionPeriod, retentionCode = @retentionCode, fileYear = @fileYear,
          fileCount = @fileCount, folderType = @folderType, pdfPath = @pdfPath,
          locationStorageType = @locationStorageType, locationUnit = @locationUnit,
          locationFace = @locationFace, locationSection = @locationSection, locationShelf = @locationShelf,
          locationStand = @locationStand, status = @status, updatedAt = @updatedAt
        WHERE id = @id
      `);
      
      const updatedData = { ...folderData, updatedAt: now };

      stmt.run({
          id: updatedData.id,
          category: updatedData.category,
          departmentId: updatedData.departmentId,
          clinic: updatedData.clinic || null,
          unitCode: updatedData.unitCode || null,
          fileCode: updatedData.fileCode,
          subject: updatedData.subject,
          specialInfo: updatedData.specialInfo || null,
          retentionPeriod: updatedData.retentionPeriod,
          retentionCode: updatedData.retentionCode,
          fileYear: updatedData.fileYear,
          fileCount: updatedData.fileCount,
          folderType: updatedData.folderType,
          pdfPath: updatedData.pdfPath || null,
          locationStorageType: updatedData.location?.storageType,
          locationUnit: updatedData.location?.unit || null,
          locationFace: updatedData.location?.face || null,
          locationSection: updatedData.location?.section || null,
          locationShelf: updatedData.location?.shelf || null,
          locationStand: updatedData.location?.stand || null,
          status: updatedData.status,
          updatedAt: updatedData.updatedAt,
      });
      
      return this.getFolderById(folderData.id);
  },

  deleteFolderAndRelations(folderId) {
      const db = this.getDbInstance();
      db.transaction(() => {
          const checkouts = this.getList('checkouts').filter(c => String(c.folderId) !== String(folderId));
          db.exec('DELETE FROM checkouts');
          const checkoutStmt = db.prepare('INSERT INTO checkouts (id, data) VALUES (?, ?)');
          for (const item of checkouts) checkoutStmt.run(String(item.id), JSON.stringify(item));

          const disposals = this.getList('disposals').filter(d => String(d.folderId) !== String(folderId));
          db.exec('DELETE FROM disposals');
          const disposalStmt = db.prepare('INSERT INTO disposals (id, data) VALUES (?, ?)');
          for (const item of disposals) disposalStmt.run(String(item.id), JSON.stringify(item));

          db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
      })();
      return { id: folderId };
  },

  getFolders(options = {}) {
    const db = this.getDbInstance();
    const {
        page = 1, limit = 20, sortBy = 'createdAt', order = 'desc',
        general, category, departmentId, clinic, fileCode, subject, specialInfo,
        startYear, endYear, retentionCode
    } = options;

    let query = 'SELECT * FROM folders';
    let countQuery = 'SELECT COUNT(*) as total FROM folders';
    let whereClauses = [];
    const params = {};

    if (general) {
        whereClauses.push(`(subject LIKE @general OR fileCode LIKE @general OR specialInfo LIKE @general OR clinic LIKE @general)`);
        params.general = `%${general}%`;
    }

    if (category && category !== 'Tümü') { whereClauses.push('category = @category'); params.category = category; }
    if (departmentId && departmentId !== 'Tümü') { whereClauses.push('departmentId = @departmentId'); params.departmentId = Number(departmentId); }
    if (clinic) { whereClauses.push('clinic LIKE @clinic'); params.clinic = `%${clinic}%`; }
    if (fileCode) { whereClauses.push('fileCode LIKE @fileCode'); params.fileCode = `%${fileCode}%`; }
    if (subject) { whereClauses.push('subject LIKE @subject'); params.subject = `%${subject}%`; }
    if (specialInfo) { whereClauses.push('specialInfo LIKE @specialInfo'); params.specialInfo = `%${specialInfo}%`; }
    if (startYear) { whereClauses.push('fileYear >= @startYear'); params.startYear = Number(startYear); }
    if (endYear) { whereClauses.push('fileYear <= @endYear'); params.endYear = Number(endYear); }
    if (retentionCode && retentionCode !== 'Tümü') { whereClauses.push('retentionCode = @retentionCode'); params.retentionCode = retentionCode; }
    
    whereClauses.push("status != 'İmha'");

    if (whereClauses.length > 0) {
        const whereString = ' WHERE ' + whereClauses.join(' AND ');
        query += whereString;
        countQuery += whereString;
    }

    const validSortColumns = ['subject', 'fileYear', 'createdAt', 'updatedAt'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    const offset = (page - 1) * limit;
    query += ` LIMIT @limit OFFSET @offset`;
    
    const countParams = { ...params };
    const queryParams = { ...params, limit, offset };
    
    const items = db.prepare(query).all(queryParams).map(rowToFolder);
    const { total } = db.prepare(countQuery).get(countParams);

    return { items, total, page, limit };
  },

  getAllFoldersForAnalysis() {
    const db = this.getDbInstance();
    const query = `
      SELECT
        folderType, status,
        locationStorageType, locationUnit, locationFace,
        locationSection, locationShelf, locationStand
      FROM folders WHERE status != 'İmha' AND locationStorageType IS NOT NULL
    `;
    return db.prepare(query).all().map(row => ({
      folderType: row.folderType,
      status: row.status,
      location: {
        storageType: row.locationStorageType,
        unit: row.locationUnit,
        face: row.locationFace,
        section: row.locationSection,
        shelf: row.locationShelf,
        stand: row.locationStand,
      }
    }));
  },

  getFoldersByLocation(location) {
    const db = this.getDbInstance();
    let query = "SELECT * FROM folders WHERE locationStorageType = @storageType AND status != 'İmha'";
    const params = { storageType: location.storageType };

    if (location.storageType === 'Kompakt') {
        query += ' AND locationUnit = @unit AND locationFace = @face AND locationSection = @section AND locationShelf = @shelf';
        params.unit = location.unit;
        params.face = location.face;
        params.section = location.section;
        params.shelf = location.shelf;
    } else if (location.storageType === 'Stand') {
        query += ' AND locationStand = @stand AND locationShelf = @shelf';
        params.stand = location.stand;
        params.shelf = location.shelf;
    }
  
    return db.prepare(query).all(params).map(rowToFolder);
  },

  getActiveCheckoutsWithFolders() {
    const db = this.getDbInstance();
    const checkoutsRaw = db.prepare("SELECT data FROM checkouts WHERE json_extract(data, '$.status') = 'Çıkışta'").all();
    const checkouts = checkoutsRaw.map(c => JSON.parse(c.data));
    return checkouts.map(checkout => ({
      ...checkout,
      folder: this.getFolderById(checkout.folderId)
    }));
  },

  getDisposableFolders(filter) {
    const db = this.getDbInstance();
    const currentYear = new Date().getFullYear();
    let query = 'SELECT * FROM folders WHERE status != ?';
    const params = ['İmha'];

    if (filter === 'thisYear') {
      query += ' AND (fileYear + retentionPeriod) <= ?';
      params.push(currentYear);
    } else if (filter === 'nextYear') {
      query += ' AND (fileYear + retentionPeriod) = ?';
      params.push(currentYear + 1);
    } else if (filter === 'pastYears') {
      query += ' AND (fileYear + retentionPeriod) < ?';
      params.push(currentYear);
    } else { // default to thisYear
      query += ' AND (fileYear + retentionPeriod) <= ?';
      params.push(currentYear);
    }

    query += ' ORDER BY (fileYear + retentionPeriod)';

    return db.prepare(query).all(...params).map(rowToFolder);
  },

  getDashboardStats(filters) {
    const db = this.getDbInstance();
    const { treemapFilter, yearFilter } = filters;

    const settings = this.getConfig('settings') || {};
    const storageStructure = this.getConfig('storageStructure') || {};
    const departments = this.getConfig('departments') || DEFAULT_DEPARTMENTS;
    const departmentMap = new Map(departments.map(d => [d.id, d]));

    const { totalFolders } = db.prepare(`SELECT COUNT(*) as totalFolders FROM folders WHERE status != 'İmha'`).get() || { totalFolders: 0 };
    const categoryCounts = db.prepare(`SELECT category, COUNT(*) as count FROM folders WHERE status != 'İmha' GROUP BY category`).all();
    const tibbiCount = categoryCounts.find(c => c.category === 'Tıbbi')?.count || 0;
    const idariCount = categoryCounts.find(c => c.category === 'İdari')?.count || 0;
    const { cikisBekleyenCount } = db.prepare(`SELECT COUNT(*) as cikisBekleyenCount FROM folders WHERE status = 'Çıkışta'`).get() || { cikisBekleyenCount: 0 };
    const { imhaEdilenCount } = db.prepare(`SELECT COUNT(*) as imhaEdilenCount FROM disposals`).get() || { imhaEdilenCount: 0 };

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkoutsRaw = this.getList('checkouts');
    const iadeGecikenCount = checkoutsRaw.filter(c => c.status === 'Çıkışta' && new Date(c.plannedReturnDate) < now).length;

    const currentYear = now.getFullYear();
    const { imhaBekleyenCount } = db.prepare(`SELECT COUNT(*) as imhaBekleyenCount FROM folders WHERE status != 'İmha' AND (fileYear + retentionPeriod) <= ?`).get(currentYear) || { imhaBekleyenCount: 0 };
    
    const foldersForOccupancy = db.prepare('SELECT folderType, locationStorageType FROM folders WHERE status != ?').all('İmha');
    const darW = settings.darKlasorGenisligi || 3;
    const genisW = settings.genisKlasorGenisligi || 5;
    const kompaktShelfW = settings.kompaktRafGenisligi || 100;
    const standShelfW = settings.standRafGenisligi || 120;
    
    const totalKompaktSpace = (storageStructure.kompakt || []).reduce((sum, unit) => sum + unit.faces.reduce((faceSum, face) => faceSum + face.sections.reduce((secSum, sec) => secSum + sec.shelves.length * kompaktShelfW, 0), 0), 0);
    const totalStandSpace = (storageStructure.stand || []).reduce((sum, stand) => sum + stand.shelves.length * standShelfW, 0);
    const totalSpace = totalKompaktSpace + totalStandSpace;
    const usedSpace = foldersForOccupancy.reduce((sum, f) => sum + (f.folderType === 'Dar' ? darW : genisW), 0);
    const overallOccupancy = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;
    
    // --- START: TREEMAP LOGIC ---
    let treemapQuery = `SELECT departmentId, folderType, COUNT(*) as count FROM folders WHERE status != 'İmha'`;
    const params = [];
    if (treemapFilter && treemapFilter !== 'all') {
        treemapQuery += ` AND locationStorageType = ?`;
        params.push(treemapFilter);
    }
    treemapQuery += ` GROUP BY departmentId, folderType`;
    
    const treemapCounts = db.prepare(treemapQuery).all(...params);

    const treemapDataRaw = treemapCounts.reduce((acc, row) => {
        const dept = departmentMap.get(row.departmentId);
        if (!dept) return acc;

        if (!acc[dept.category]) {
            acc[dept.category] = { name: dept.category, children: {} };
        }
        if (!acc[dept.category].children[dept.name]) {
            acc[dept.category].children[dept.name] = { name: dept.name, size: 0, folderCount: 0 };
        }
        
        acc[dept.category].children[dept.name].size += row.count * (row.folderType === 'Dar' ? darW : genisW);
        acc[dept.category].children[dept.name].folderCount += row.count;
        return acc;
    }, {});
    
    // Yüzdeyi toplam kapasiteye göre hesapla
    let totalCapacityForFilter = totalSpace;
    if (treemapFilter === 'Kompakt') {
        totalCapacityForFilter = totalKompaktSpace;
    } else if (treemapFilter === 'Stand') {
        totalCapacityForFilter = totalStandSpace;
    }

    const treemapData = Object.values(treemapDataRaw).map((category) => {
        const childrenArray = Object.values(category.children);
        return {
            name: category.name,
            children: childrenArray.map(child => ({
                ...child,
                percentage: totalCapacityForFilter > 0 ? (child.size / totalCapacityForFilter) * 100 : 0,
                category: category.name
            }))
        };
    });
    // --- END: TREEMAP LOGIC ---

    const clinicDistributionData = db.prepare(`SELECT clinic as name, COUNT(*) as value FROM folders WHERE category = 'Tıbbi' AND status != 'İmha' AND clinic IS NOT NULL AND clinic != '' GROUP BY clinic ORDER BY value DESC`).all();
    
    const availableYears = db.prepare(`SELECT DISTINCT fileYear FROM folders ORDER BY fileYear DESC`).all().map(r => r.fileYear);
    
    const months = [];
    const endDate = new Date();
    let startDate = new Date();
    startDate.setHours(0,0,0,0);
    endDate.setHours(23,59,59,999);

    if (yearFilter === 'last12' || !availableYears.includes(Number(yearFilter))) {
        startDate.setMonth(startDate.getMonth() - 11);
        startDate.setDate(1);
    } else {
        startDate = new Date(Number(yearFilter), 0, 1);
        endDate.setFullYear(Number(yearFilter), 11, 31);
    }

    let d = new Date(startDate);
    while (d.getFullYear() < endDate.getFullYear() || (d.getFullYear() === endDate.getFullYear() && d.getMonth() <= endDate.getMonth())) {
        months.push({ 
            name: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            "Eklenen Klasör": 0, "Çıkan Klasör": 0, "İmha Edilen Klasör": 0
        });
        d.setMonth(d.getMonth() + 1);
    }
    const monthMap = new Map(months.map((m, i) => [m.name, i]));
    
    const createdFolders = db.prepare(`SELECT createdAt FROM folders WHERE createdAt >= ? AND createdAt <= ?`).all(startDate.toISOString(), endDate.toISOString());
    createdFolders.forEach(f => {
        const d = new Date(f.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthMap.has(key)) months[monthMap.get(key)]["Eklenen Klasör"]++;
    });

    checkoutsRaw.forEach(c => {
        const d = new Date(c.checkoutDate);
        if (d >= startDate && d <= endDate) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthMap.has(key)) months[monthMap.get(key)]["Çıkan Klasör"]++;
        }
    });

    const disposalsRawForChart = this.getList('disposals');
    disposalsRawForChart.forEach(disp => {
        const d = new Date(disp.disposalDate);
        if (d >= startDate && d <= endDate) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthMap.has(key)) months[monthMap.get(key)]["İmha Edilen Klasör"]++;
        }
    });
    
    const monthlyData = months.map(m => ({...m, name: m.name.split('-')[1] + '/' + m.name.split('-')[0].slice(2) }));

    return {
      totalFolders, tibbiCount, idariCount, cikisBekleyenCount, iadeGecikenCount,
      imhaBekleyenCount, imhaEdilenCount, overallOccupancy: overallOccupancy || 0, treemapData,
      clinicDistributionData,
      monthlyData, availableYears
    };
  },

  // Büyük dosya okuma/yazma için örnek stream fonksiyonu
  async copyLargeFile(sourcePath, destPath) {
    await streamPipeline(
      fs.createReadStream(sourcePath),
      fs.createWriteStream(destPath)
    );
  }
};

module.exports = dbManager;