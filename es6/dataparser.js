/**
 * mit-js
 * License: MIT
 * Source: https://github.com/JoeFerri/mit-js
 * Copyright (c) 2024 Giuseppe Ferri <jfinfoit@gmail.com>
 */


export default class DataParser {

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
  static NO_VALUE     = '‡ø';

  constructor() {
  }

  static parse = {
    'byJSON': (sheetJSON) => {
      return DataParser.#dataSheetToJSON(sheetJSON);
    },
    'byString': (sheetString) => {
      return DataParser.#dataSheetToJSON(JSON.parse(sheetString));
    },
    'getTableString': (sheetJSON, {classes = [], id = null} = {}) => {
      return DataParser.#jsonSheetToTableString(sheetJSON, {classes,id});
    },
    'getTableHTML': (sheetJSON, {classes = [], id = null} = {}) => {
      return DataParser.#jsonSheetToTableHTML(sheetJSON, {classes,id});
    }
  }

  static #dataSheetToJSON(dataSheetJSON) {
    let sheetJSON = {
      "rows": []
    };
    
    const rows = dataSheetJSON.data.split(DataParser.ROW_SEP);
    rows.forEach(row => {
      const [rowNumber,rowData] = row.split(DataParser.NUM_ROW_SEP);
      const colsData = rowData.split(DataParser.COL_SEP);
      let rowJSON = {
        "number": rowNumber,
        "cells": []
      };

      colsData.forEach(cellData => {
        const cellInfo = cellData.split(DataParser.NUM_CELL_SEP);
        rowJSON.cells.push({
          "col": cellInfo[0],
          "value": cellInfo[1] == DataParser.NO_VALUE ? '' : cellInfo[1]
        });
      });
      for (let i = rowJSON.cells.length; i < dataSheetJSON.actualColCount; i++) {
        rowJSON.cells.push({
          "col": i,
          "value": ''
        });
      }

      sheetJSON.rows.push(rowJSON);
    });
    dataSheetJSON.sheet = sheetJSON;
    return dataSheetJSON;
  }


  static #jsonSheetToTableString(sheetJSON, {classes = [], id = null} = {}) {
    let table = '<table';
    if (classes.length > 0) {
      table += ` class="${classes.join(' ')}"`;
    }
    if (id) {
      table += ` id="${id}"`;
    }
    table += '>';

    table += '<thead></thead>';

    table += '<tbody>';
    sheetJSON.sheet.rows.forEach(row => {
      table += '<tr>';

      row.cells.forEach(cell => {
        table += `<td id="${sheetJSON.target}-row_${row.number}-col_${cell.col}-cell">${cell.value}</td>`
      });

      table += '</tr>';
    });
    table += '</tbody>';

    table += '<tfoot></tfoot>';

    table += '</table>';

    return table;
  }


  static #jsonSheetToTableHTML(sheetJSON, {classes = [], id = null} = {}) {
    let sheetTableString = DataParser.#jsonSheetToTableString(sheetJSON, {classes,id});
    let temp = document.createElement('template');
    sheetTableString = sheetTableString.trim();
    temp.innerHTML = sheetTableString;
    return temp.content.firstChild;
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
    "rowCount": worksheet.rowCount,
    "colCount": worksheet.columnCount,
    "actualRowCount": worksheet.actualRowCount,
    "actualColCount": worksheet.actualColumnCount,
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