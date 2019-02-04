// import {SolutionField} from '../classes/Picross';

const ctx: Worker = self as any;

console.log('hello from a webworker');

export enum SolutionField {
  No,
  Yes,
  Unknown
}
ctx.addEventListener('message', (message) => {
  // console.log('worker a');
    const {rows, index, hints, size, solution} = message.data;
    const possibleSolutions = filterSolutions(generateAllSolutionForRow(hints, size), rows, index, hints, size, solution);
    const evaluation = evaluateSolutions(possibleSolutions, size);
    ctx.postMessage(evaluation);
    // ctx.postMessage('yolo');
});
function evaluateSolutions(possibleSolutions: SolutionField[][], size: number) {
  const line: SolutionField[] = [];
  if (possibleSolutions.length === 1) {
    for (let i = 0; i < size; i++) {
      line.push(possibleSolutions[0][i]);
    }
  } else {
    for (let i = 0; i < size; i++) {
      let sameOnAll = true;
      const value = possibleSolutions[0][i];
      for (const possibleSolution of possibleSolutions) {
        if (possibleSolution[i] !== value) {
          sameOnAll = false;
        }
      }
      if (sameOnAll) {
        line.push(value);
      } else {
        line.push(SolutionField.Unknown);
      }
    }
  }
  return line;
}
function generateAllSolutionForRow(hints: number[], size: number): SolutionField[][] {
  const totalSpace = size - hints.reduce((prev, curr) => prev + curr, 0);
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
function filterSolutions(solutions: SolutionField[][], rows: boolean, index: number, hints: number[], size: number, solutionDone: SolutionField[][]): SolutionField[][] {
  return solutions.filter(solution => {
    let possible = true;
    for (let i = 0; i < size; i++) {
      let field = rows ? solutionDone[index][i] : solutionDone[i][index];
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
