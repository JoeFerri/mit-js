/**
 * mit-js
 * License: MIT
 * Source: https://github.com/JoeFerri/mit-js
 * Copyright (c) 2024 Giuseppe Ferri <jfinfoit@gmail.com>
 */


const fs = require('fs');
const path = require('node:path')
const AdmZip = require('adm-zip');


module.exports = class XDatabase {
  
  #appDir = "";
  #dataDir = "";
  #confFileDir = "";
  #confFileName = "";
  #confFilePath = "";
  #confJSONTemplate = null; // usato per resettare lo stato di confJSON
  #confJSON = null;

  #isInit = false;

  constructor ({appDir, dataDir, confFileDir , confFileName, confJSONTemplate = null} = {}) {
    if (!appDir || appDir == '')              throw new Error('appDir is required');
    if (!dataDir || dataDir == '')            throw new Error('dataDir is required');
    if (!confFileDir || confFileDir == '')    throw new Error('confFileDir is required');
    if (!confFileName || confFileName == '')  throw new Error('confFileName is required');
    this.#appDir = appDir;
    this.#dataDir = dataDir;
    this.#confFileDir = confFileDir;
    this.#confFileName = confFileName;
    this.#confFilePath = path.join(confFileDir, confFileName);
    this.#confJSONTemplate = confJSONTemplate || require(path.join(__dirname, 'xdatabase_conf_template.json'));
    this.#confJSON = this.getConfJSONFromFile() || JSON.parse(JSON.stringify(this.#confJSONTemplate));
  }

  get appDir () {
    return this.#appDir;
  }

  get dataDir () {
    return this.#dataDir;
  }

  get confJSON () {
    return JSON.parse(JSON.stringify(this.#confJSON)); // deep clone
  }

  get confFilePath () {
    return this.#confFilePath;
  }

  get confFileDir () {
    return this.#confFileDir;
  }

  get confFileName () {
    return this.#confFileName;
  }

  get docsPath () {
    return this.#confJSON.docs.path;
  }

  confJSONIsInit () {
    return this.#confJSON && typeof this.#confJSON.init === 'boolean' && this.#confJSON.init === true;
  }

  xDatabaseIsInit () {
    return this.#isInit;
  }

  init ({databasePath = null} = {}) {
    if (!this.#appDir || !fs.existsSync(this.#appDir) || !fs.statSync(this.#appDir).isDirectory()) {
      throw new Error('appDir is not valid');
    }
    if (this.confJSONIsInit()) {
      let check = true;
      try {
        check = this.checkDatabasePath({databasePath: this.#confJSON.database.path});
      }
      catch (err) {
        console.log("Il path del database non e' valido o e' corrotto: ", err);
        check = false;
      }
      if (!check) {
        this.#confJSON.init = false;
        this.#writeConfFile();
      }
    }
    
    this.#updateConfFile();
    try {
      this.validateConf({compare: true})
    }
    catch (err) {
      console.log("La configurazione del database non e' valida o e' corrotta: ", err);
      this.#confJSON = JSON.parse(JSON.stringify(this.#confJSONTemplate));
      this.#writeConfFile();
    }
    this.#isInit = true;
  }

  getConfJSONFromFile () {
    if (!fs.existsSync(this.#confFilePath)) return null;
    return JSON.parse(fs.readFileSync(this.#confFilePath, 'utf8'));
  }

  isValidConf ({confJSON = null} = {}) {
    confJSON = confJSON || this.#confJSON;

    return  confJSON != null &&
            typeof confJSON === 'object' &&
            typeof confJSON.init === 'boolean' &&
            typeof confJSON.database === 'object' && 
            // 'path' in confJSON.database &&
            typeof confJSON.database.path === 'string' && 
            typeof confJSON.files === 'object' &&
            typeof confJSON.version === 'string' &&
            typeof confJSON.docs === 'object' &&
            // 'path' in confJSON.docs &&
            typeof confJSON.docs.path === 'string' &&
            typeof confJSON.docs.zip === 'boolean';
  }

  validateConf ({confJSON = null, compare = false} = {}) {
    if (!this.isValidConf({confJSON})) {
      throw new Error('confJSON is not valid');
    }
    if (compare) {
      confJSON = confJSON || this.#confJSON;
      let sheetJSON = JSON.parse(fs.readFileSync(this.#confFilePath, 'utf8'));
      if (!XDatabase.compareConfJSONFile({confJSON1: confJSON, confJSON2: sheetJSON})) {
        throw new Error('Discordanza tra la configurazione del database e la configurazione del file di configurazione.');
      }
    }
  }

  static compareConfJSONFile ({confJSON1 = null, confJSON2 = null} = {}) {
    if (!confJSON1) throw new Error('confJSON1 is required');
    if (!confJSON2) throw new Error('confJSON2 is required');
    if (confJSON1 != confJSON2 || JSON.stringify(confJSON1) !== JSON.stringify(confJSON2)) {
      if (confJSON1.init != confJSON2.init ||
          confJSON1.database.path != confJSON2.database.path) return false;
      for (const target in confJSON1.files) {
        if (!confJSON2.files[target] || confJSON1.files[target].name != confJSON2.files[target].name ||
            confJSON1.files[target].sheet != confJSON2.files[target].sheet) return false;
      }
      for (const target in confJSON2.files) {
        if (!confJSON1.files[target] || confJSON1.files[target].name != confJSON2.files[target].name ||
            confJSON1.files[target].sheet != confJSON2.files[target].sheet) return false;
      }
    }
    return true;
  }

  #writeConfFile () {
    fs.writeFileSync(this.#confFilePath, JSON.stringify(this.#confJSON, null, 2));
  }

  #updateConfFile () {
    if (!fs.existsSync(this.#confFilePath)) {
      this.#writeConfFile();
    }
  }

  updateDatabasePath ({databasePath = null} = {}) {
    if (!this.#isInit) throw new Error('Database not initialized');
    if (!this.#confJSON.init) {
      console.log(`Il database non e' ancora inizializzato`);
      let pathOk = this.#confJSON.database.path != "";
      if (pathOk) {
        try {
          pathOk = this.checkDatabasePath({databasePath: this.#confJSON.database.path})
        } catch (error) {
          console.log(error);
          pathOk = false;
        }
      }
      if (!pathOk) {
        this.setDatabasePath({databasePath});
      }
      else {
        this.#confJSON.init = true;
        this.#writeConfFile();
      }
    }
  }

  updateDocsPath ({docsPath = null, zip = false} = {}) {
    if (!this.#isInit) throw new Error('Database not initialized');
    if (docsPath && fs.existsSync(docsPath) && fs.statSync(docsPath).isDirectory()) {
      this.#confJSON.docs.path = docsPath;
      this.#confJSON.zip = zip;
      this.#writeConfFile();
    }
    else {
      throw new Error('docsPath is not valid');
    }
  }

  loadDocsZip({docsPath}) {
    if (!this.#isInit) throw new Error('Database not initialized');
    if (docsPath && fs.existsSync(docsPath) && fs.statSync(docsPath).isFile()) {
      let zPath = path.join(this.#dataDir, 'docs');
      // Crea un oggetto AdmZip per il file zip selezionato
      const zip = new AdmZip(docsPath);
    
      // Estrai la cartella "docs" dall'archivio zip
      const zipEntries = zip.getEntries();
      const docsFolderEntry = zipEntries.find(entry => entry.entryName.startsWith('docs/') && entry.isDirectory);
    
      if (docsFolderEntry) {
        // Estrai tutti i file PDF dalla cartella "docs"
        const pdfEntries = zipEntries.filter(entry => entry.entryName.startsWith(docsFolderEntry.entryName) && entry.entryName.endsWith('.pdf'));
    
        console.log(`Estrazione di ${pdfEntries.length} file PDF dal file zip.`);

        // Crea la cartella zPath se non esiste
        if (!fs.existsSync(zPath)) {
          fs.mkdirSync(zPath, { recursive: true });
          console.log(`Cartella ${zPath} creata correttamente.`);
        }
    
        // Estrai e copia i file PDF nella cartella zPath
        pdfEntries.forEach(entry => {
          const targetPath = path.join(zPath, path.basename(entry.entryName));
          zip.extractEntryTo(entry, zPath, false, true);
          console.log(`File ${entry.entryName} estratto e copiato nella cartella ${zPath}`);
        });
    
        if (pdfEntries.length > 0) {
          console.log(`File PDF estratti e copiati correttamente nella cartella ${zPath}`);
          this.#confJSON.docs.path = zPath;
          this.#confJSON.zip = true;
          this.#writeConfFile();
        }
        else {
          throw new Error('Non sono stati trovati file PDF nella cartella "docs" nel file zip.');
        }
      } else {
        throw new Error(`La cartella "docs" non e' stata trovata nel file zip.`);
      }
    }
    else {
      throw new Error('docsPath is not valid');
    }
  }

  setDatabasePath ({databasePath = null} = {}) {
    if (!this.#isInit) throw new Error('Database not initialized');
    this.checkDatabasePath({databasePath});
    this.#confJSON.database.path = databasePath;
    // confJSON è inizializzato se è stato definito un percorso di database
    this.#confJSON.init = true;
    this.#writeConfFile();
  }
  
  checkDatabasePath({databasePath = null} = {}) {
    if (!databasePath && !this.#isInit) throw new Error('Database not initialized');
    databasePath = databasePath || this.#confJSON.database.path;
    return fs.existsSync(databasePath) && fs.statSync(databasePath).isDirectory();
  }
}