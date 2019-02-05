// import RowColWorker = require('worker-loader!./rowColWorker');
// import {EventEmitter} from 'events';
import * as bluebird from 'bluebird';

// const delay = (time: number) => new Promise(resolve => window.setTimeout(resolve, time));
export class ContradictionError extends Error {
  contradiction = true;
  constructor (m: string) {
    super(m);
    Object.setPrototypeOf(this, ContradictionError.prototype);
  }
}
console.log('hello from picross');
export interface IPicrossState {
  size: number;
  solution: Solution;
  colsHints: IHints;
  rowsHints: IHints;
  guess: IGuess[];
}
export class Picross {
  public size: number;
  public solution: SolutionField[][];
  // public solution: SharedArrayBuffer; new SharedArrayBuffer(1024);
  public guess: IGuess[] = [];
  // private workerPool: RowColWorker[] = [];
  private rowCache = new Map<number, SolutionField[]>();
  private colCache = new Map<number, SolutionField[]>();
  private mostExpensiveRowOrCol = 0;
  constructor(public rowsHints: IHints, public colsHints: IHints, public sendMessage: (data: any) => void) {
    console.log('hello from picross constructor');
    this.size = Math.max(this.rowsHints.length, this.colsHints.length);
    // for (let i = 0; i < this.size; i++) {
      //   this.workerPool.push(new RowColWorker());
      // }
      while (this.rowsHints.length < this.size) {
        this.rowsHints.push([]);
      }
      while (this.colsHints.length < this.size) {
        this.colsHints.push([]);
      }
      this.solution = [];
      for (let x = 0; x < this.size; x++) {
        const row = [];
        for (let y = 0; y < this.size; y++) {
          row.push(SolutionField.Unknown);
        }
        this.solution.push(row);
      }
      this.emitPartial();
  }
  emit(obj: any) {
    this.sendMessage(obj);
  }
  emitPartial() {
    const state: IPicrossState = {
      size: this.size,
      solution: this.solution,
      colsHints: this.colsHints,
      rowsHints: this.rowsHints,
      guess: this.guess
    };
    this.emit({
      type: 'partial',
      state
    });
  }
  async solveRowsOrColls(rows: boolean, maxCost: number) {
    const rowOrCollHints = rows ? this.rowsHints : this.colsHints;
    await bluebird.map(rowOrCollHints, async (hints, index) => {
      // if (rows) {
      //   this.emit({
      //     type: 'calculating',
      //     row: index,
      //     col: -1
      //   });
      // } else {
      //   this.emit({
      //     type: 'calculating',
      //     row: -1,
      //     col: index
      //   });
      // }
      let cacheSame = true;
      if (rows) {
        const cache = this.rowCache.get(index);
        if (typeof cache === 'undefined') {
          cacheSame = false;
        } else {
          for (let i = 0; i < this.size; i++) {
            if (cache[i] !== this.solution[index][i]) {
              cacheSame = false;
            }
          }
        }
      } else {
        const cache = this.colCache.get(index);
        if (typeof cache === 'undefined') {
          cacheSame = false;
        } else {
          for (let i = 0; i < this.size; i++) {
            if (cache[i] !== this.solution[i][index]) {
              cacheSame = false;
            }
          }
        }
      }
      if (!cacheSame) {
        const evaluation = await this.optimizedRowOrCol(rows, hints, index, maxCost);
        if (evaluation !== false) {
          // if (rows) {
          //   this.emitPartial();
          // } else {
          //   this.emitPartial();
          // }
          await this.animationFrame();
          let i = -1;
          for (const field of evaluation) {
            i++;
            if (field !== SolutionField.Unknown) {
              if (rows) {
                this.solution[index][i] = field;
              } else {
                this.solution[i][index] = field;
              }
            }
          }
          if (rows) {
            this.rowCache.set(index, evaluation);
          } else {
            this.colCache.set(index, evaluation);
          }
        }
        // this.emitPartial();
      }
    }, {concurrency: 1});
  }
  async animationFrame() {
    // return new Promise(resolve => {
    //   requestAnimationFrame(() => {
    //     resolve();
    //   });
    // });
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      });
    });
  }
  hardCopyArray<Type>(input: Type[]): Type[] {
    const ret: Type[] = [];
    for (const child of input) {
      ret.push(child);
    }
    return ret;
  }
  solveBorder(baseLine: SolutionField[], hints: number[]) {
    let i = 0;
    let changed = false;
    while (baseLine[i] === SolutionField.No) {
      i++;
    }
    if (baseLine[i] === SolutionField.Yes) {
      for (let x = 0; x < hints[0]; x++) {
        if (baseLine[i + x] === SolutionField.No) {
          throw new ContradictionError('asd');
        } else if (baseLine[i + x] === SolutionField.Unknown) {
          baseLine[i + x] = SolutionField.Yes;
          changed = true;
        }
      }
      if (baseLine[i + hints[0]] === SolutionField.Yes) {
        throw new ContradictionError('asd2');
      } else if (baseLine[i + hints[0]] === SolutionField.Unknown) {
        baseLine[i + hints[0]] = SolutionField.No;
        changed = true;
      }
    }
    i = this.size - 1;
    while (baseLine[i] === SolutionField.No) {
      i--;
    }
    if (baseLine[i] === SolutionField.Yes) {
      const lastHint = hints[hints.length - 1];
      for (let x = 0; x < lastHint; x++) {
        if (baseLine[i - x] === SolutionField.No) {
          throw new ContradictionError('asd');
        } else if (baseLine[i - x] === SolutionField.Unknown) {
          baseLine[i - x] = SolutionField.Yes;
          changed = true;
        }
      }
      if (baseLine[i - lastHint] === SolutionField.Yes) {
        throw new ContradictionError('asd2');
      } else if (baseLine[i - lastHint] === SolutionField.Unknown) {
        baseLine[i - lastHint] = SolutionField.No;
        changed = true;
      }
    }
    return {changed, baseLine};
  }
  async optimizedRowOrCol(rows: boolean, hints: number[], index: number, maxCost: number) {
    const totalSpace = this.size - hints.reduce((prev, curr) => prev + curr, 0);
    const cost = totalSpace * hints.length;
    const baseLine: SolutionField[] = [];
    for (let i = 0; i < this.size; i++) {
      if (rows) {
        baseLine.push(this.solution[index][i]);
      } else {
        baseLine.push(this.solution[i][index]);
      }
    }
    if (cost > maxCost) {
      if (this.mostExpensiveRowOrCol < cost) {
        this.mostExpensiveRowOrCol = cost;
      }
      const {changed, baseLine: result} = this.solveBorder(baseLine, hints);
      if (changed) {
        return result;
      }
      return false;
    }
    console.log(totalSpace, hints.length);
    if (hints.length === 0) {
      return Array(this.size).fill(SolutionField.No);
    }
    let spacings: number[] = [];
    for (let i = 0; i < hints.length; i++) {
      spacings.push(i === 0 ? 0 : 1);
    }
    let running = true;
    let firstSolution: SolutionField[]|null = null;
    while (running) {
      const solution = Array(this.size).fill(SolutionField.No);
      let offset = 0;
      let conflict = false;
      for (const [spaceIndex, space] of spacings.entries()) {
        for (let i = 0; i < space; i++) {
          if (baseLine[offset] === SolutionField.Yes) {
            conflict = true;
          }
          offset += 1;
        }
        for (let i = 0; i < hints[spaceIndex]; i++) {
          if (baseLine[offset] !== SolutionField.No) {
            solution[offset] = SolutionField.Yes;
          } else {
            conflict = true;
          }
          offset++;
        }
      }
      for (let i = offset; i < this.size; i++) {
        if (baseLine[i] === SolutionField.Yes) {
          conflict = true;
        }
      }
      if (solution.length !== this.size) {
        throw new Error('eh');
      }
      if (!conflict) {
        if (firstSolution === null) {
          firstSolution = this.hardCopyArray(solution);
        } else {
          for (let i = 0; i < this.size; i++) {
            if (firstSolution[i] !== solution[i]) {
              firstSolution[i] = SolutionField.Unknown;
            }
          }
        }
      }
      spacings[0]++;
      let spaceUsed = spacings.reduce((prev, curr) => prev + curr, 0);
      let i = 1;
      while (spaceUsed > totalSpace && running) {
        if (i === hints.length ) {
          // debugger;
          // console.log('Dunso?');
          running = false;
          // await this.animationFrame();
        }
        spacings[0] = 0;
        for (let x = 1; x < i; x++) {
          spacings[x] = 1;
        }
        spacings[i]++;
        spaceUsed = spacings.reduce((prev, curr) => prev + curr, 0);
        i++;
      }
      // console.log(spacings, i);
      // running = false;
    }
    if (firstSolution === null) {
      throw new ContradictionError('asd5');
    }
    return firstSolution;
  }
  verifySolution(): boolean {
    for (let rowI = 0; rowI < this.size; rowI++) {
      let colI = 0;
      const hints = this.rowsHints[rowI];
      for (const hint of hints) {
        while (colI < this.size && this.solution[rowI][colI] === SolutionField.No) {
          colI++;
        }
        if (colI === this.size) {
          return false;
        }
        for (let i = 0; i < hint; i++) {
          if (colI === this.size || this.solution[rowI][colI] !== SolutionField.Yes) {
            return false;
          }
          colI++;
        }
      }
    }
    for (let colI = 0; colI < this.size; colI++) {
      let rowI = 0;
      const hints = this.colsHints[colI];
      for (const hint of hints) {
        while (rowI < this.size && this.solution[rowI][colI] === SolutionField.No) {
          rowI++;
        }
        if (rowI === this.size) {
          return false;
        }
        for (let i = 0; i < hint; i++) {
          if (rowI === this.size || this.solution[rowI][colI] !== SolutionField.Yes) {
            return false;
          }
          rowI++;
        }
      }
    }
    return true;
  }
  async solve(disableRow: boolean = false, disableCol: boolean = false) {
    let counter = 0;
    let solved = false;
    this.guess = [];
    let maxCost = 30;
    while (!solved) {
      let changed = true;
      let jumpedOutDirect = true;
      maxCost = 10;
      try {
        while (changed) {
          changed = false;
          let before = JSON.stringify(this.solution);
          if (!disableRow) {
            await this.solveRowsOrColls(true, maxCost);
            // await this.animationFrame();
            this.emitPartial();
          }
          if (!disableCol) {
            await this.solveRowsOrColls(false, maxCost);
            // await this.animationFrame();
            this.emitPartial();
          }
          changed = before !== JSON.stringify(this.solution);
          if (!changed) {
            maxCost += 10;
            console.log('maxCost', maxCost, this.mostExpensiveRowOrCol);
            if (maxCost <= this.mostExpensiveRowOrCol) {
              changed = true;
            }
          }
          if (changed) {
            jumpedOutDirect = false;
          }
          console.log(counter);
        }
      } catch (e) {
        if (e.contradiction) {
          console.log('found irregular, jumping back', e);
          console.log(`guess length: ${this.guess.length} typeof: ${typeof this.guess}`);
          if (this.guess.length === 0) {
            throw new Error('found irregular, no guess');
          }
          if (jumpedOutDirect) {
            let i = this.guess.length - 1;
            while (this.guess[i].guessSolution) {
              i--;
            }
            console.log(i, 'i', this.guess);
            this.guess[i].guessSolution = false;
            this.solution = this.guess[i].solutionBefore;
            this.solution[this.guess[i].coordinates.row][this.guess[i].coordinates.col] = SolutionField.No;
            if (i > 0) {
              this.guess.splice(i + 1);
            } else {
              this.guess.splice(0);
            }
          } else {
            const guess = this.guess[this.guess.length - 1];
            guess.guessSolution = false;
            this.solution = guess.solutionBefore;
            this.solution[guess.coordinates.row][guess.coordinates.col] = SolutionField.No;
            if (this.guess.length === 1) {
              this.guess.splice(0);
            }
          }
          this.emitPartial();
        } else {
          throw (e);
        }
      }
      solved = true;
      for (const solutionRow of this.solution) {
        for (const solutionCol of solutionRow) {
          if (solutionCol === SolutionField.Unknown) {
            solved = false;
          }
        }
      }
      // solved = true;
      if (!solved) {
        // guess
        let changedSomething = false;
        let row = -1;
        for (const solutionRow of this.solution)  {
          row++;
          let col = -1;
          for (const solutionCol of solutionRow) {
            col++;
            if (!changedSomething && solutionCol === SolutionField.Unknown) {
              solutionRow[col] = SolutionField.Yes;
              changedSomething = true;
              const guess = {
                guessSolution: true,
                coordinates: {
                  row, col
                },
                solutionBefore: this.solution.map(row => row.map(col => col))
              };
              this.guess.push(guess);
              console.log(guess);
              this.emitPartial();
            }
          }
        }
        // const potGuess = this.findGuessPosition();
        // this.solution[potGuess.row][potGuess.col] = SolutionField.Yes;
        // const guess = {
        //   guessSolution: true,
        //   coordinates: {
        //     row: potGuess.row, col: potGuess.col
        //   },
        //   solutionBefore: this.solution.map(row => row.map(col => col))
        // };
        // this.guess.push(guess);
        // console.log(guess);
        // this.emitGuess();
        // await this.animationFrame();
      } else if (!this.verifySolution()) {
        let i = this.guess.length - 1;
        while (i--) {
           if (this.guess[i].guessSolution === true) {
            break;
          }
        }
        console.log(i, 'i');
        this.guess[i].guessSolution = false;
        this.solution = this.guess[i].solutionBefore;
        this.solution[this.guess[i].coordinates.row][this.guess[i].coordinates.col] = SolutionField.No;
        if (i > 0) {
          this.guess.splice(i + 1);
        } else {
          this.guess.splice(0);
        }
        this.emitPartial();
      }

      counter++;
    }
    if (!this.verifySolution()) {
      throw new Error('Wrong Solution');
    }
    this.emitPartial();
    this.emit({
      type: 'done'
    });
    // console.log(this);
  }
  findGuessPosition() {
    interface IPotGuess {
      row: number;
      col: number;
      prio: number;
    }
    const potGuesses: IPotGuess[] = [];
    // if (rows) {
    //   this.solution[index][i] = field;
    // } e
    for (let row = 0; row < this.size; row++) {
      let col = 0;
      let prio = 0;
      while (col < this.size) {
        if (this.solution[row][col] !== SolutionField.Unknown) {
          if (prio > 0) {
            potGuesses.push({
              row,
              col: col - 1,
              prio
            });
            prio = 0;
          }
        } else {
          prio++;
        }
        col++;
      }
    }
    potGuesses.sort((a, b) => {
      return a.prio - b.prio;
    });
    return potGuesses[0];
  }
  filterSolutions(solutions: SolutionField[][], rows: boolean, index: number, hints: number[]) {
    return solutions.filter(solution => {
      let possible = true;
      for (let i = 0; i < this.size; i++) {
        let field = rows ? this.solution[index][i] : this.solution[i][index];
        if (field === SolutionField.Unknown) {

        } else if (field !== solution[i]) {
          return false;
        }
      }
      let pointer = 0;
      for (const hint of hints) {
        while (solution[pointer] === SolutionField.No) {
          pointer++;
          if (typeof solution[pointer] === 'undefined') {
            possible = false;
            break;
          }
        }
        if (!possible) {
          break;
        }
        for (let i = 0; i < hint; i++) {
          if (typeof solution[pointer + i] !== 'undefined' && solution[pointer + i] === SolutionField.Yes) {

          } else {
            possible = false;
          }
        }
        pointer += hint;
        if (typeof solution[pointer] !== 'undefined' && solution[pointer] === SolutionField.Yes) {
          possible = false;
        }
        pointer++;
        if (!possible) {
          break;
        }
      }
      while (typeof solution[pointer] !== 'undefined') {
        if (solution[pointer] === SolutionField.Yes) {
          possible = false;
        }
        pointer++;
      }
      return possible;
    });
  }
  generateAllSolutionForRow(hints: number[]): SolutionField[][] {
    const totalSpace = this.size - hints.reduce((prev, curr) => prev + curr, 0);
    let spacings: number[][] = [];
    for (let spacingIndex = 0; spacingIndex <= hints.length; spacingIndex++) {
      if (spacingIndex === 0) {
        for (let space = 0; space <= totalSpace; space++) {
          spacings.push([space]);
        }
      } else  {
        const spacingsNew = [];
        for (const spacing of spacings) {
          const usedUpSpace = spacing.reduce((prev, curr) => prev + curr, 0);
          for (let space = (spacingIndex === 0 || spacingIndex === hints.length ? 0 : 1); space <= (totalSpace - usedUpSpace); space++) {
            spacingsNew.push([...spacing, space]);
          }
        }
        spacings = spacingsNew;
      }
    }
    spacings = spacings.filter(spacing => {
      return spacing.reduce((prev, curr) => prev + curr, 0) === totalSpace;
    });
    return spacings.map(spacing => {
      const solution: SolutionField[] = [];
      spacing.forEach((space, spaceIndex) => {
        for (let i = 0; i < space; i++) {
          solution.push(SolutionField.No);
        }
        if (typeof hints[spaceIndex] !== 'undefined') {
          for (let i = 0; i < hints[spaceIndex]; i++) {
            solution.push(SolutionField.Yes);
          }
        }
      });
      // console.log(solution, hints);
      return solution;
    });
  }
}
export enum SolutionField {
  No,
  Yes,
  Unknown
}
export type Solution = SolutionField[][];
export interface ICoordinate {
  col: number;
  row: number;
}
export interface IGuess {
  guessSolution: boolean;
  coordinates: ICoordinate;
  solutionBefore: Solution;
}
export interface IGuessWithoutSolutionBefore {
  guessSolution: boolean;
  coordinates: ICoordinate;
}
export type IHints = number[][];
