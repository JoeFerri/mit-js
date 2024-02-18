/**
 * mit-js
 * License: MIT
 * Source: https://github.com/JoeFerri/mit-js
 * Copyright (c) 2024 Giuseppe Ferri <jfinfoit@gmail.com>
 */


const path = require('node:path')
const ExcelJS = require('exceljs');


module.exports = class DataParser {

  static STELE_HEAD_COL = {
    'A':1,  'B':2,  'C':3,  'D':4,  'E':5,  'F':6,  'G':7,  'H':8,  'I':9,  'J':10, 'K':11, 'L':12, 'M':13,
    'N':14, 'O':15, 'P':16, 'Q':17, 'R':18, 'S':19, 'T':20, 'U':21, 'V':22, 'W':23, 'X':24, 'Y':25, 'Z':26,
    'AA':27,'AB':28,'AC':29,'AD':30,'AE':31,'AF':32,'AG':33,'AH':34,'AI':35,'AJ':36,'AK':37,'AL':38,'AM':39,
    'AN':40,'AO':41,'AP':42,'AQ':43,'AR':44,'AS':45,'AT':46,'AU':47,'AV':48,'AW':49,'AX':50,'AY':51,'AZ':52,
    'BA':53,'BB':54,'BC':55,'BD':56,'BE':57,'BF':58,'BG':59,'BH':60,'BI':61,'BJ':62,'BK':63,'BL':64,'BM':65,
    'BN':66,'BO':67,'BP':68,'BQ':69,'BR':70,'BS':71,'BT':72,'BU':73,'BV':74,'BW':75,'BX':76,'BY':77,'BZ':78};

  static SECTION_SEP  = '‡§';
  static ROW_SEP      = '‡~';
  static COL_SEP      = '‡ç';
  static NUM_CELL_SEP = '‡¥';
  static NUM_ROW_SEP  = '‡þ';

  constructor() {
  }

  static parse = {
    'byExcelToJSON': async ({ target = '',
                        fileName = '',
                        fileSheet = '',
                        filePath = '',
                        creator = '',
                        lastModifiedBy = '',
                        created = null } = {}) => {
      return await DataParser.#excelSheetToJSON ({target,
                                                  fileName,
                                                  fileSheet,
                                                  filePath,
                                                  creator,
                                                  lastModifiedBy,
                                                  created});
    },
    'byExcelToString': async ({ target = '',
                                fileName = '',
                                fileSheet = '',
                                filePath = '',
                                creator = '',
                                lastModifiedBy = '',
                                created = null } = {}) => {
      let dataSheetJSON = await DataParser.#excelSheetToJSON ({ target,
                                                            fileName,
                                                            fileSheet,
                                                            filePath,
                                                            creator,
                                                            lastModifiedBy,
                                                            created});
      return JSON.stringify(dataSheetJSON);
    }
  }

  static async #excelSheetToJSON ({ target = '',
                                    fileName = '',
                                    fileSheet = '',
                                    filePath = '',
                                    creator = '',
                                    lastModifiedBy = '',
                                    created = null} = {}) {
  
    let dataRaw = "";

    if (fileName == "") {
      if (filePath != "") {
        fileName = path.basename(filePath);
        // only name = path.parse(fileNameWithPathSeparator).name;
        // only ext = path.parse(fileNameWithPathSeparator).ext;
      }
    }
  
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
  
    workbook.creator = creator;
    workbook.lastModifiedBy = lastModifiedBy;
    if (created) workbook.created = created; // new Date(1985, 8, 30);
    workbook.modified = new Date();
  
    const worksheet = workbook.getWorksheet(fileSheet);
  
    // const json = JSON.stringify(workbook.model);
    // console.log(json); // the json object
  
  
    // <rowNumber>‡þ<colNumber>‡¥<value|result>‡ç<colNumber>‡¥<value|result>‡ç...<colNumber>‡¥<value|result>‡~
    //      1            1          GDES             2            PCR                10            FG
  
    worksheet.eachRow((row, rowNumber) => {
      if (dataRaw != "") dataRaw += `${DataParser.ROW_SEP}`;
      dataRaw += `${rowNumber}${DataParser.NUM_ROW_SEP}`;
      let first = true;
      row.eachCell((cell, colNumber) => {
        if (first) {
          first = false;
        }
        else {
          dataRaw += DataParser.COL_SEP;
        }
        dataRaw += `${colNumber}${DataParser.NUM_CELL_SEP}${typeof cell.value === 'object' ? cell.result : cell.value}`;
      })
    })
  
    let dataSheetJSON = {
      "target": target,
      "file": {
        "name": fileName,
        "sheet": fileSheet,
        "path": filePath
      },
      "data": dataRaw
    }
  
    return dataSheetJSON;
  }

}


/*
  sheetJSON = {
    "target": target,
    "file": {
      "name": filenameInput,
      "sheet": sheetInput,
      "path": filePathInput
    },
    "data": dataRaw,
    "sheet": {
      "rows": [
        {
          "number": 1,
          "cells": [
            {                          cella 1
              "col": 1,
              "value": "value 1"
            },
            {                          cella 2
              "col": 2,
              "value": "value 2"
            }
          ]
        },
        {
          ...
        }
      ]
    }
  }
*/