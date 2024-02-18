/**
 * mit-js
 * License: MIT
 * Source: https://github.com/JoeFerri/mit-js
 * Copyright (c) 2024 Giuseppe Ferri <jfinfoit@gmail.com>
 */


const fs = require('fs');
const path = require('node:path')


module.exports = class XDatabase {
  
  #confFileDir = "";
  #confFileName = "";
  #confFilePath = "";
  #confJSONTemplate = null; // usato per resettare lo stato di confJSON
  #confJSON = null;

  #isInit = false;

  constructor ({confFileDir , confFileName, confJSONTemplate = null} = {}) {
    if (!confFileDir || confFileDir == '')   throw new Error('confFileDir is required');
    if (!confFileName || confFileName == '') throw new Error('confFileName is required');
    this.#confFileDir = confFileDir;
    this.#confFileName = confFileName;
    this.#confFilePath = path.join(confFileDir, confFileName);
    this.#confJSONTemplate = confJSONTemplate || require(path.join(__dirname, 'xdatabase_conf_template.json'));
    this.#confJSON = this.getConfJSONFromFile() || JSON.parse(JSON.stringify(this.#confJSONTemplate));
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

  confJSONIsInit () {
    return this.#confJSON && typeof this.#confJSON.init === 'boolean' && this.#confJSON.init === true;
  }

  xDatabaseIsInit () {
    return this.#isInit;
  }

  init ({databasePath = null} = {}) {
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
            confJSON.database && 
            'path' in confJSON.database &&
            confJSON.files;
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