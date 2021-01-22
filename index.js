const { getArtistsHrefsByLetter, getIncompleteTabsByArtistHref, getCompleteTabsByIncompleteTabs, getCompleteTabByHref, log } = require("./utils/scrap-utils");

const { insertTablature } = require('./utils/database-utils');

/**
 * Solo una letra a la ves. Cuando termina, hago otro
 */
const executeScrappingByLetterAndSaveFile = async(letter) => {

    log("Comenzando..")
    const artistsHrefs = await getArtistsHrefsByLetter(letter);
    
    const incompleteTabsPromises = artistsHrefs
        .map(
            async href => await getIncompleteTabsByArtistHref(href)
        );

    const incompleteTabsDirty = await Promise.all(incompleteTabsPromises);

    const incompleteTabsDirty2 = incompleteTabsDirty.map(a => a.body.mainList);

    const incompleteTabsDirty3 = incompleteTabsDirty2.reduce(
        (acum, artistArray) => acum.concat(artistArray),
        []
    );

    const incompleteTabsDirty4 = incompleteTabsDirty3.reduce(
        (acum, it) => it && it.dataTabs ? acum.concat([it.dataTabs]) : acum
        ,
        []
    )

    const incompleteTabsFinal = incompleteTabsDirty4.reduce(
        (acum, tabInfo) => acum.concat(tabInfo),
        []
    );
    
    const completeTabs = await getCompleteTabsByIncompleteTabs(incompleteTabsFinal);

    log("Scrapping completo")
    log("Iniciando inserts mysql...")
    
    const filteredCompleteTabs = completeTabs
        .filter(tab => tab.isNew)

    console.log(filteredCompleteTabs)

    const insertPromises = filteredCompleteTabs
        .map(
            async tab => await insertTablature(tab)
        );
    
    log(`Tabs nuevas: ${insertPromises ? insertPromises.length : 0}`)

    const insertResults = await Promise.all(insertPromises)

    log("Finalizado")

    // log(insertResults)
}

executeScrappingByLetterAndSaveFile('z')