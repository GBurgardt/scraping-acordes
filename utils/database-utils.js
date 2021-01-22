const mysql = require('mysql');

const pool = mysql.createPool({
    host: '127.0.0.1',
    // user: process.env.MYSQL_USER,
    // password: process.env.MYSQL_PASS,
    user: 'root',
    password: '',
    database : 'acordesfacil',
    connectionLimit : 10
});


const simpleQuery = (query, valueParams = null) =>
    new Promise(
        (resolve, reject) => 
            valueParams ?
                pool.query(
                    query,
                    valueParams,
                    (err, result, fields) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result)
                        }
                    }
                ) :
                pool.query(
                    query,
                    (err, result, fields) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result)
                        }
                    }
                )
    )

const defaultResponse = (message, status = 0, body = null) => ({
    status,
    message,
    body
})

const insertTablature = (jsonTab) => {
    
    // const query = `insert into tablatures (nro, href, htmlTab, laCuerdaId, artist, songName) values (${jsonTab.nro}, '${jsonTab.href}', QUOTE('${jsonTab.htmlTab}'), '${jsonTab.laCuerdaId}', '${jsonTab.artist}', '${jsonTab.songName}');`;

    let query = "INSERT INTO tablatures (nro, href, htmlTab, laCuerdaId, artist, songName) VALUES (?,?,?,?,?,?)";
    let valueParams = [jsonTab.nro, jsonTab.href, jsonTab.htmlTab, jsonTab.laCuerdaId, jsonTab.artist, jsonTab.songName];

    return simpleQuery(query, valueParams)
        .then(
            (res) => 
                res && res.affectedRows && res.affectedRows > 0 ?
                    defaultResponse('Tablature creado con exito', 0, res):
                    defaultResponse('Hubo algun problema', -1, res)
            

        )
        .catch(
            err => {
                return defaultResponse(err.message, -1);
            }
        )
}


/**
 * Checkea si existe en la base
 * @param {} href 
 */
const checkIfNewTab = async href => {
    let resp = [];

    try {
        resp = await simpleQuery(`select id from tablatures where href = '${href}'`);
    } catch(err) {
        console.log("ERROR MYSQL")
        console.log(err)
    }

    if (resp.length <= 0) {
        console.log("NUEVA")
        console.log(href)
        console.log("FIN NUEVA")
    }

    // Si es 0 no encontró nada, por lo tanto no existe, por lo tanto es nueva
    return resp.length <= 0
}


exports.insertTablature = insertTablature;
exports.checkIfNewTab = checkIfNewTab;




// insertTablature({
//     type: 'K',
//     nro: 2,
//     href: 'charly_garcia/hablando_a_tu_corazon-2',
//     htmlTab:
//         'Este espectacular tema de Charly, lleva 5 sonidos de\nTeclados diferentes.\nPero... voy a resumir un poco... en dos teclados no mas.\nUno es un piano, que es\nla base del tema, el otro es un Brass.. (también suena un String)\npero a esos dos los voy a escribir juntos.\n\n\nMinúsculas: nota por tecla.\nMayúsculas: acorde\n/teclas combinadas\n-: nota por tecla\nP: piano (casi todas las notas son blancas) | B: brass\n\n\n\nP0:  |---------|-a4/e5---|\n     |-a2-(x9)-|-a2-(x4)-|\n\nP1: |-a4/e5-------|\n    |-A-----A-A-A-|\n\n    |-g#4/e5------------------|\n    |-G#m#5-G#m#5-G#m#5-G#m#5-| (g#m#5=g#/b/e)\n\n    |-f#m#5-f#m#5-D-D-|         (f#m#5=f#/a/d)\n\n    |-A-A-A-A-|\n\nP2: |-A-----------|-Auag--------|\n    |-a2-a2-a2-a2-|-g2-g2-g2-g2-|\n\n    |-e4/a4----|-A-----|-A/e5--------|\n    |-a2---a2--|-a2-a2-|-a2-a2-a2-a2-|\n\nP3: |-e4/a#4-b4-a4-e4-d4-c#4-b3-| (escalera)\n\nP4: |-e4--e4/a#4--b4--e4/a4--e4| (escalera)\n\nP5: |-d4/f4--f#4-c#4/e4-b3/d4-a3/c#4--f#3/b3-| (esc..)\n\nP6: |-a4/e5/a5(x7 rapido)-| x2\n\nP7: |-c#4-e4-c#4-a3---g4-f#4-e4-c#4--| Varias veces\n    |--A------A-------A----------A-|\n\nB1: |--a4------e5-------a4--|\n\nB2: |-c#4----e4-----a3---a3---a3-|\nB3: |-c#5---C#5-e5-c#5-f#5-c#5-e5-| |-a5-(x6)-a4-(x6)-|\n                                             Aveces hace.\n---------------------------------------------------------------\nP0\n\nP1\nOh, no puedes ser feliz\nCon tanta gente hablando, hablando a tu alrededor.\nP1\nOh, dame tu amor a mi\nEstoy hablando, hablando, hablando a tu corazón\n\nP2\nCuando estas muy solo, sola en la calle\n                 B2\nCon tanta gente hablando, hablando a tu alrededor.\nP2\nNecesitas alguien que te acompañe\n                   B2\nEstoy hablando, hablando, hablando a tu corazón.\n\nP1 + B2\nOh, no puedes ser feliz\nCon tanta gente hablando, hablando a tu alrededor.\nP1 + B2\nOh, dame tu amor a mi\nEstoy hablando, hablando, hablando a tu corazón\n\nP2                              P3\nNo importa el lenguaje, ni las palabras.\nNi las fronteras que separan nuestro amor.\nP2                                    P4\nQuiero que me escuches y que te habrás\nEstoy hablando, hablando, hablando a tu corazón P5\n\nOh, no ... (igual)\n\nB3\n\nP1                                   P6\nOh, no puede ser feliz.\nP1\nOh, dame tu amor a mi.\n\nOh, no.....(igual)\n\nFinal con P7\n',
//     laCuerdaId: 'cgar0212',
//     artist: 'charly garcia',
//     songName: 'hablando a tu corazon-2'
// }).then(
//     r => {
//         console.log("insdie func inside")
//         console.log(r)
//     }
// )


// simpleQuery(`select * from tablatures`)
//         .then(
//             (res) => console.log(res)

//         )




// const executeInPool = async (functionToExec) => {
//     pool.getConnection(async (err, connection) => {
//         console.log("joasdjoasjd")
//         await functionToExec();

//         pool.end();
//     });
// }