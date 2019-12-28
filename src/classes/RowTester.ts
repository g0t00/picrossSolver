import {SolutionField, ContradictionError} from './Picross';

export class RowTester {
  async leftRightMethod(hints: number[], baseLine: SolutionField[]): Promise<SolutionField[]> {
    const size = baseLine.length;
    const hintsPositionLeft: number[] = [];
    let pointer = -1;
    for (const hint of hints) {
      let possible = false;
      while (!possible) {
        pointer++;
        possible = true;
        for (let i = 0; i < hint; i++) {
          if (baseLine[pointer + i] === SolutionField.No) {
            possible = false;
          }
        }
        if (baseLine[pointer + hint] === SolutionField.Yes) {
          possible = false;
        }
      }
      hintsPositionLeft.push(pointer);
      pointer += hint;
    }
    // console.log(hintsPositionLeft);
    const hintsPositionRight: number[] = [];

    pointer = size;
    for (let hintI = 0; hintI < hints.length; hintI++) {
      const hint = hints[hints.length - hintI - 1];
      // console.log('hint', hint);
      let possible = false;
      while (!possible) {
        pointer--;
        possible = true;
        for (let i = 0; i < hint; i++) {
          if (baseLine[pointer - i] === SolutionField.No) {
            possible = false;
          }
        }
        if (baseLine[pointer - hint] === SolutionField.Yes) {
          possible = false;
        }
      }
      // console.log(pointer);
      hintsPositionRight.push(pointer);
      pointer -= hint;
    }
    hintsPositionRight.reverse();
    // console.log(hintsPositionRight);
    for (let i = 0; i < hints.length; i++) {
      const hint = hints[i];
      let overlap = hint - (hintsPositionRight[i] - (hint - 1) - hintsPositionLeft[i]);
      // console.log(overlap, hint);
      if (overlap > 0) {
        for (let x = 0; x < overlap; x++) {
          baseLine[hintsPositionLeft[i] + (hint - overlap) + x] = SolutionField.Yes;
        }
      }
    }
    // Fill X from Borders
    pointer = 0;
    for (const hint of hints) {
      while (baseLine[pointer] === SolutionField.No) {
        pointer++;
      }
    }
    return baseLine;
  }
  async reference(hints: number[], baseLine: SolutionField[]): Promise<SolutionField[]> {
    const size = baseLine.length;
    if (hints.length === 0) {
      return Array(size).fill(SolutionField.No);
    }
    const totalSpace = size - hints.reduce((prev, curr) => prev + curr, 0);

    // console.log(totalSpace, hints.length);
    let spacings: number[] = [];
    for (let i = 0; i < hints.length; i++) {
      spacings.push(i === 0 ? 0 : 1);
    }
    let running = true;
    let firstSolution: SolutionField[]|null = null;
    while (running) {
      const solution = Array(size).fill(SolutionField.No);
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
      for (let i = offset; i < size; i++) {
        if (baseLine[i] === SolutionField.Yes) {
          conflict = true;
        }
      }
      if (solution.length !== size) {
        throw new Error('eh');
      }
      if (!conflict) {
        if (firstSolution === null) {
          firstSolution = [];
          for (const field of solution) {
            firstSolution.push(field);
          }
        } else {
          for (let i = 0; i < size; i++) {
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

}
(async () => {

for (let i = 0; i < 10000; i++) {
  const rowTester = new RowTester();
  const hintsLength = Math.ceil(5 * Math.random());
  const hints = [];
  for (let i = 0; i < hintsLength; i++) {
    hints.push(Math.ceil(5 * Math.random()));
  }
  const size = hints.reduce((acc, value) => acc + value, 0) + hints.length - 1 + Math.round(4 * Math.random());
  const baseLine = [];
  for (let x = 0; x < size; x++) {
    if (Math.random() < 0.10) {
      if (Math.random() > 0.5) {
        baseLine.push(SolutionField.Yes);
      } else {
        baseLine.push(SolutionField.No);
      }
    } else {
      baseLine.push(SolutionField.Unknown);
    }
  }
  // const size = Math.random() *
  const baseLine2 = JSON.parse(JSON.stringify(baseLine));
  // baseLine[3] = SolutionField.No;
  let referenceResult;
  let leftRightResult;
  try {
     referenceResult = await rowTester.reference(hints, baseLine2);
     leftRightResult = await rowTester.leftRightMethod(hints, baseLine);
  } catch (e) {
    if (e instanceof ContradictionError) {
    } else  {
      console.error(e);
    }
  }
  if (typeof referenceResult !== 'undefined') {
    if (typeof leftRightResult === 'undefined') {
      throw new Error('leftRightResult kaput!');
    }
    for (let x = 0; x < size; x++) {
      // if (leftRightResult[x] !== SolutionField.Unknown) {
        if (leftRightResult[x] !== referenceResult[x]) {
          console.log(hints, size, 'hints size');

          console.log(baseLine);
          console.log(referenceResult);
          console.log(leftRightResult);
          throw new Error('nope');
        }
      // }
    }

  }
}
})();
