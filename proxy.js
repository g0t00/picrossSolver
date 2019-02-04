const rp = require('request-promise');
const http = require('http');
const webpbn = async () => {
  const response = await rp({
    method: 'POST',
    uri: 'https://webpbn.com/random.cgi',
    formData: {
      sid: '',
      go: '1',
      psize: '3',
      pcolor: '1',
      pmulti: '1',
      save: '1'
    },
    simple: false,
    transform: (_, response) => {
      return response.headers.location;
    }
  });
  const match = response.match(/id=(\d+)/i);
  if (!match) {
    throw new Error('No id');
  }
  const id = match[1];
  let idPadded = id;
  console.log(id, match);
  while (idPadded.length < 6) {
    idPadded = '0' + idPadded;
  }
  const response2 = await rp({
    method: 'POST',
    uri: 'https://webpbn.com/export.cgi/webpbn' + idPadded,
    formData: {
      sid: '',
      go: '1',
      id: id,
      xml_clue: 'on',
      xml_soln: 'on',
      ss_soln: 'on',
      sg_clue: 'on',
      sg_soln: 'on',
      fmt: 'faase'
    }
  });
}
const puzzleNonogramms_com = async () => {
  const response = await rp('https://www.puzzle-nonograms.com/?size=4');
  const match = response.match(/task\s*=\s*'([^']+)'/i);
  if (!match) {
    throw new Error('ASD');
  }
  const task = match[1].split('/');
  const size = task.length / 2;
  const colHints = [];
  for (let i = 0; i < size; i++) {
    colHints.push(task[i].split('.').map(hint => parseInt(hint, 10)));
  }
  const rowHints = [];
  for (let i = size; i < 2 * size; i++) {
    rowHints.push(task[i].split('.').map(hint => parseInt(hint, 10)));
  }
  return JSON.stringify({rowHints, colHints});
}
http.createServer(async (_, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*'
  });
  console.log('got request');


  // console.log('request sending', await webpbn
  const response = await puzzleNonogramms_com();
  console.log('request sending');
  // res.end();
  res.end(response);
}).listen(9615, () => {
  console.log('listening on 9615');
});
