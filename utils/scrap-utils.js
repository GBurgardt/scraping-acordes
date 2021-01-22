const baseUrl = 'https://acordes.lacuerda.net';
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const rp = require('request-promise')

const util = require('util')

const { insertTablature, checkIfNewTab } = require("./database-utils");

const log = (json) => console.log(util.inspect(json, false, null, true))


const getScrapRequest = (method, url) =>
    rp({
        encoding: null,
        method: method,
        uri: url
    }).then(html => {
        const $ = cheerio.load(
            iconv.decode(
                new Buffer(html), "UTF-8"
            ),
            { decodeEntities: false }
        );

        return $;
    })

const getNormalRequest = (method, url) =>
    rp({
        method: method,
        uri: url
    }).then(
        resp => {
            try {
                return JSON.parse(resp);
            } catch(err) {
                return resp
            }
        }
    )
    .catch(
        err => {
            console.log(err)
        }
    )


/**
 * Obtener una tab con textos 
 * @param {*} hrefSongId Ejemplo: https://acordes.lacuerda.net/enanitos/amores_lejanos-7.shtml sería enanitos/amores_lejanos-7
 */
const getCompleteTabByHref = (hrefSongId) =>
    getScrapRequest('GET', `${baseUrl}/${hrefSongId}.shtml`)
        .then(
            $ => {
                    
                const auxScriptCode = $('head script');

                const auxcac = auxScriptCode.toString();
                const code = auxcac
                    .substring(
                        auxcac.indexOf(`ocod='`) + `ocod='`.length,
                        auxcac.indexOf(', odes') - 1
                    )

                const preElement = $('#t_body pre');

                return { 
                    body: {
                        pre: preElement.html(),
                        laCuerdaId: code
                    }, 
                    statusCode: 200 
                }
            }
        )
        .catch(
            ({ message: body, statusCode }) => ({ body, statusCode })
        );




/**
 * Dado un array de tabs incompletas (sin hrefs entre otros)
 * Esto devuelve completas (listas para subir a la base)
 * @param  tabs 
 */
const getCompleteTabsByIncompleteTabs = async allDataTabas => {

    const newDataTabsPromises = allDataTabas
        .map(
            async (tab) => {

                log(`Comprobante si ya existe ${tab.href}...`)
                
                const isNew = await checkIfNewTab(tab.href);

                let htmlTabObject = null;

                if (isNew) {
                    log(`Scrapeando ${tab.href}...`)
                    htmlTabObject = await getCompleteTabByHref(tab.href);
                }


                return {
                    ...tab,
                    htmlTab: htmlTabObject ? htmlTabObject.body.pre : null,
                    laCuerdaId: htmlTabObject ? htmlTabObject.body.laCuerdaId : null,
                    artist: tab.href
                        .substring(
                            1, 
                            tab.href.indexOf('/', 2)
                        )
                        .replace(
                            new RegExp('_', 'g'), 
                            ' '
                        ),
                    songName: tab.href
                        .substring(
                            tab.href.indexOf('/', 2) + 1
                        )
                        .replace(
                            new RegExp('_', 'g'), 
                            ' '
                        ),
                    nro: Number(tab.nro),
                    isNew
                        
                }
            }
        );

    const newDataTabs = await Promise.all(newDataTabsPromises);

    const tabsFinal = newDataTabs
        .map(
            tab => ({
                ...tab,
                songName: newDataTabs.find(t2 => t2.nro === 1).songName
            })
        )

    return tabsFinal
}

/**
 * 
 * @param {*} hrefArtist Ejemplo: https://acordes.lacuerda.net/abel_pintos/ sería abel_pintos
 */
const getIncompleteTabsByArtistHref = (hrefArtist) => 
    getScrapRequest('GET', `${baseUrl}${hrefArtist}`)
        .then(
            $ => {
                    
                const mainList = []

                $('#b_main li').each(function(i) {
                    const href = $('a', this).attr('href'); 
                    const lcd = $(this).attr('lcd'); 

                    const typesTabs = lcd.substring(
                        0, 
                        lcd.indexOf('-') 
                    ).split('');

                    const nroTabs = lcd.substring(
                        lcd.indexOf('-') + 1,
                    ).split('');


                    const dataTabs = typesTabs.map(
                        (tt, indTt) => ({
                            type: tt,
                            nro: nroTabs[indTt],
                            href: `${hrefArtist}${href}${
                                Number(nroTabs[indTt]) === 1 ? '' : '-' + nroTabs[indTt]
                            }`
                        })
                    )

                    const allMetaData = {
                        hrefBase: `${hrefArtist}${href}`, 
                        dataTabs,
                        cantTotalTabs: (lcd.length - 1) / 2
                    }

                    mainList.push(allMetaData);
                });

                // console.log(util.inspect(mainList, false, null, true))

                return { 
                    body: { mainList },
                    statusCode: 200 
                }
            }
        )
        .catch(
            ({ message: body, statusCode }) => ({ body, statusCode })
        );

        
const getArtistsHrefsByLetter = async letter => {

    const $letterHtml = await getScrapRequest('GET', `${baseUrl}/tabs/${letter}/index0.html`);

    const pagesLength = $letterHtml('.multipag ul')[0].children.length - 1;

    const pagesPromises = [...Array(pagesLength)]
        .map(
            (_, ind) => getScrapRequest('GET', `${baseUrl}/tabs/${letter}/index${ind === 0 ? ind : ind+'00'}.html`) 
        );
        
    const allHtmls = await Promise.all(pagesPromises);
  
    const allArtistHrefs = allHtmls
        .map(
            $ => {
                const artistsHrefs = []

                $('#i_main li').each(function(i) {
                    const href = $('a', this).attr('href'); 

                    artistsHrefs.push(href)
                });


                return { 
                    body: { letter, artistsHrefs },
                    statusCode: 200 
                }
            }
        )
        .reduce(
            (acum, letterObj) => acum.concat(letterObj.body.artistsHrefs),
            []
        )

    return allArtistHrefs
            
}

// getArtistsHrefsByLetter('a')

exports.getCompleteTabByHref = getCompleteTabByHref;
exports.getCompleteTabsByIncompleteTabs = getCompleteTabsByIncompleteTabs;
exports.getIncompleteTabsByArtistHref = getIncompleteTabsByArtistHref;
exports.getArtistsHrefsByLetter = getArtistsHrefsByLetter;
exports.log = log;