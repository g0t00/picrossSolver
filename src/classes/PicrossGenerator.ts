import {IHints} from './Picross';
export class PicrossGenerator {
  public fields: boolean[][];
  public rowsHints: IHints;
  public colsHints: IHints;
  constructor(public size: number) {
    this.generate();
  }
  generate() {
    this.fields = [];
    for (let i = 0; i < this.size; i++) {
      const row = [];
      for (let j = 0; j < this.size; j++) {
        row.push(Math.random() > 0.6);
      }
      this.fields.push(row);
    }
    // rows
    this.rowsHints = [];
    for (const row of this.fields) {
      const rowHints: number[] = [];
      let hint = 0;
      let colI = 0;
      while (colI < this.size) {
        if (!row[colI]) {
          if (hint > 0) {
            rowHints.push(hint);
            hint = 0;
          }
        } else {
          hint++;
        }
        colI++;
      }
      if (hint > 0) {
        rowHints.push(hint);
      }
      this.rowsHints.push(rowHints);
    }
    this.colsHints = [];
    for (let colI = 0; colI < this.size; colI++) {
      const colHints = [];
      let hint = 0;
      let rowI = 0;
      while (rowI < this.size) {
        if (!this.fields[rowI][colI]) {
          if (hint > 0) {
            colHints.push(hint);
            hint = 0;
          }
        } else {
          hint++;
        }
        rowI++;
      }
      if (hint > 0) {
        colHints.push(hint);
      }
      this.colsHints.push(colHints);
    }
  }
}
