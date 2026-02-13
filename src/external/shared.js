/********************************************************************************
 * Copyright (c) 2018 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/ 
 /**
  * This file contains functions, which are required by the core package as
  * well as by the assertions package
  */

// A special JSON validator that is used only to check whether the given object has duplicate keys.
// The standard library doesn't detect duplicate keys and overwrites the first one with the second one.
// TODO: replace with jsonlint ??
import jsonValidator from 'json-dup-key-validator';


// This is used to validate if the multi language JSON keys are valid according to the BCP47 spec
const bcp47pattern = /^(?:(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))$|^((?:[a-z]{2,3}(?:(?:-[a-z]{3}){1,3})?)|[a-z]{4}|[a-z]{5,8})(?:-([a-z]{4}))?(?:-([a-z]{2}|\d{3}))?((?:-(?:[\da-z]{5,8}|\d[\da-z]{3}))*)?((?:-[\da-wy-z](?:-[\da-z]{2,8})+)*)?(-x(?:-[\da-z]{1,8})+)?$|^(x(?:-[\da-z]{1,8})+)$/i  


export {
    checkPropUniqueness,
    checkSecurity,
    checkMultiLangConsistency,
    checkLinksRelTypeCount,
    checkUriSecurity,
    checkTmOptionalPointer
}

/**
 * This function returns part of the object given in param with the value found when resolving the path. Similar to JSON Pointers.
 * In case no path is found, the param defaultValue is echoed back
 * Taken from
 * https://stackoverflow.com/questions/6491463/accessing-nested-javascript-objects-and-arrays-by-string-path/6491621#6491621
 * @param {object} object
 * @param {string} path
 * @param {any} defaultValue
 * @return {object}
 **/
const resolvePath = (object, path, defaultValue) => path
    //eslint-disable-next-line
    .split(/[\.\[\]\'\"]/)
    .filter(p => p)
    .reduce((o, p) => o ? o[p] : defaultValue, object)

// -------------------------------------------------- checkPropUniqueness

/**
 *  Checking whether in one interaction pattern there are duplicate names, e.g. two properties called temp
 *  However, if there are no properties then it is not-impl
 *
 * @param {string} tdString The Td under test as string
 */
function checkPropUniqueness(tdString) {

    const results = []

    // jsonvalidator throws an error if there are duplicate names in the interaction level
    try {
        jsonValidator.parse(tdString, false)

        const td = JSON.parse(tdString)

        // no problem in interaction level
         
        // let tdInteractions = [] // not used

        // checking whether there are properties at all, if not uniqueness is not impl
        if (Object.prototype.hasOwnProperty.call(td, "properties")) {
            // tdInteractions = tdInteractions.concat(Object.keys(td.properties)) // not used
            // then we can add unique properties pass
            results.push({
                "ID": "td-properties_uniqueness",
                "Status": "pass",
                "Comment": ""
            })
        } else {
            // then we add unique properties as not impl
            results.push({
                "ID": "td-properties_uniqueness",
                "Status": "not-impl",
                "Comment": "no properties"
            })
        }

        // similar to just before, checking whether there are actions at all, if not uniqueness is not impl
        if (Object.prototype.hasOwnProperty.call(td, "actions")) {
            // tdInteractions = tdInteractions.concat(Object.keys(td.actions)) // not used
            results.push({
                "ID": "td-actions_uniqueness",
                "Status": "pass",
                "Comment": ""
            })
        } else {
            // then we add unique actions as not impl
            results.push({
                "ID": "td-actions_uniqueness",
                "Status": "not-impl",
                "Comment": "no actions"
            })
        }

        // similar to just before, checking whether there are events at all, if not uniqueness is not impl
        if (Object.prototype.hasOwnProperty.call(td, "events")) {
            // tdInteractions = tdInteractions.concat(Object.keys(td.events)) // not used
            results.push({
                "ID": "td-events_uniqueness",
                "Status": "pass",
                "Comment": ""
            })
        } else {
            // then we add unique events as not impl
            results.push({
                "ID": "td-events_uniqueness",
                "Status": "not-impl",
                "Comment": "no events"
            })
        }

        return results

    } catch (error) {
        // there is a duplicate somewhere

        // convert it into string to be able to process it
        // error is of form = Error: Syntax error: duplicated keys "overheating" near ting": {
        const errorString = error.toString()
        // to get the name, we need to remove the quotes around it
        const startQuote = errorString.indexOf('"')
        // slice to remove the part before the quote
        const restString = errorString.slice(startQuote + 1)
        // find where the interaction name ends
        const endQuote = restString.indexOf('"')
        // finally get the interaction name
        const interactionName = restString.slice(0, endQuote)

        // trying to find where this interaction is and put results accordingly
        const td = JSON.parse(tdString)

        if (Object.prototype.hasOwnProperty.call(td, "properties")) {
            const tdProperties = td.properties
            if (Object.prototype.hasOwnProperty.call(tdProperties, interactionName)) {
                // duplicate was at properties but that fails the td-unique identifiers as well
                results.push({
                    "ID": "td-properties_uniqueness",
                    "Status": "fail",
                    "Comment": "duplicate property names"
                })
                // since JSON.parse removes duplicates, we replace the duplicate name with duplicateName
                tdString = tdString.replace(interactionName, "duplicateName")

            } else {
                // there is duplicate but not here, so pass
                results.push({
                    "ID": "td-properties_uniqueness",
                    "Status": "pass",
                    "Comment": ""
                })
            }
        } else {
            results.push({
                "ID": "td-properties_uniqueness",
                "Status": "not-impl",
                "Comment": "no properties"
            })
        }

        if (Object.prototype.hasOwnProperty.call(td, "actions")) {
            const tdActions = td.actions
            if (Object.prototype.hasOwnProperty.call(tdActions, interactionName)) {
                // duplicate was at actions but that fails the td-unique identifiers as well
                results.push({
                    "ID": "td-actions_uniqueness",
                    "Status": "fail",
                    "Comment": "duplicate action names"
                })
                // since JSON.parse removes duplicates, we replace the duplicate name with duplicateName
                tdString = tdString.replace(interactionName, "duplicateName")
            } else {
                results.push({
                    "ID": "td-actions_uniqueness",
                    "Status": "pass",
                    "Comment": ""
                })
            }
        } else {
            results.push({
                "ID": "td-actions_uniqueness",
                "Status": "not-impl",
                "Comment": "no actions"
            })
        }

        if (Object.prototype.hasOwnProperty.call(td, "events")) {
            const tdEvents = td.events
            if (Object.prototype.hasOwnProperty.call(tdEvents, interactionName)) {
                // duplicate was at events but that fails the td-unique identifiers as well
                results.push({
                    "ID": "td-events_uniqueness",
                    "Status": "fail",
                    "Comment": "duplicate event names"
                })
                // since JSON.parse removes duplicates, we replace the duplicate name with duplicateName
                tdString = tdString.replace(interactionName, "duplicateName")
            } else {
                results.push({
                    "ID": "td-events_uniqueness",
                    "Status": "pass",
                    "Comment": ""
                })
            }
        } else {
            results.push({
                "ID": "td-events_uniqueness",
                "Status": "not-impl",
                "Comment": "no events"
            })
        }

        return results
    }
}


// -------------------------------------------------- checkSecurity

/**
 * check if used Security definitions are properly defined previously
 * @param {object} td The TD to do assertion tests
 */
function checkSecurity(td) {

    const results = []
    if (Object.prototype.hasOwnProperty.call(td, "securityDefinitions")) {
        const securityDefinitionsObject = td.securityDefinitions
        const securityDefinitions = Object.keys(securityDefinitionsObject)


        const rootSecurity = td.security

        if (securityContains(securityDefinitions, rootSecurity)) {
            // all good
        } else {
            results.push({
                "ID": "td-security-scheme-name",
                "Status": "fail",
                "Comment": "used a non defined security scheme in root level"
            })
            return results
        }

        if (Object.prototype.hasOwnProperty.call(td, "properties")) {
            // checking security in property level
            let tdProperties = Object.keys(td.properties)
            for (let i = 0; i < tdProperties.length; i++) {
                const curPropertyName = tdProperties[i]
                const curProperty = td.properties[curPropertyName]

                // checking security in forms level
                const curForms = curProperty.forms
                for (let j = 0; j < curForms.length; j++) {
                    const curForm = curForms[j]
                    if (Object.prototype.hasOwnProperty.call(curForm, "security")) {
                        const curSecurity = curForm.security
                        if (securityContains(securityDefinitions, curSecurity)) {
                            // all good
                        } else {
                            results.push({
                                "ID": "td-security-scheme-name",
                                "Status": "fail",
                                "Comment": "used a non defined security scheme in a property form"
                            })
                            return results
                        }
                    }
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(td, "actions")) {
            // checking security in action level
            let tdActions = Object.keys(td.actions)
            for (let i = 0; i < tdActions.length; i++) {
                const curActionName = tdActions[i]
                const curAction = td.actions[curActionName]

                // checking security in forms level
                const curForms = curAction.forms
                for (let j = 0; j < curForms.length; j++) {
                    const curForm = curForms[j]
                    if (Object.prototype.hasOwnProperty.call(curForm, "security")) {
                        const curSecurity = curForm.security
                        if (securityContains(securityDefinitions, curSecurity)) {
                            // all good
                        } else {
                            results.push({
                                "ID": "td-security-scheme-name",
                                "Status": "fail",
                                "Comment": "used a non defined security scheme in an action form"
                            })
                            return results
                        }
                    }
                }

            }
        }

        if (Object.prototype.hasOwnProperty.call(td, "events")) {
            // checking security in event level
            let tdEvents = Object.keys(td.events)
            for (let i = 0; i < tdEvents.length; i++) {
                const curEventName = tdEvents[i]
                const curEvent = td.events[curEventName]

                // checking security in forms level
                const curForms = curEvent.forms
                for (let j = 0; j < curForms.length; j++) {
                    const curForm = curForms[j]
                    if (Object.prototype.hasOwnProperty.call(curForm, "security")) {
                        const curSecurity = curForm.security
                        if (securityContains(securityDefinitions, curSecurity)) {
                            // all good
                        } else {
                            results.push({
                                "ID": "td-security-scheme-name",
                                "Status": "fail",
                                "Comment": "used a non defined security scheme in an event form"
                            })
                            return results
                        }
                    }
                }

            }
        }

        // no security used non defined scheme, passed test
        results.push({
            "ID": "td-security-scheme-name",
            "Status": "pass"
        })
        return results

    }
    return results
}

/**
 * subfunction of checkSecurity
 * security anywhere could be a string or array. Convert string to array
 *
 * @param {*} parent
 * @param {string|Array<string>} child
 */
function securityContains(parent, child) {

    if (typeof child === "string") {
        child = [child]
    }
    return child.every(elem => parent.indexOf(elem) > -1)
}


// -------------------------------------------------- checkMultiLangConsistency

/**
 *  this checks whether all titles and descriptions have the same language fields
 *  so the object keys of a titles and of a descriptions should be the same already,
 *  then everywhere else they should also be the same
 *
 *  first collect them all, and then compare them
 *
 * @param {object} td The TD to do assertion tests
 */
function checkMultiLangConsistency(td) {

    const results = []
    const multiLang = [] // an array of arrays where each small array has the multilang keys
    const isTdTitlesDescriptions = [] // an array of boolean values to check td-titles-descriptions assertion

    // checking root
    if (Object.prototype.hasOwnProperty.call(td, "titles")) {
        const rootTitlesObject = td.titles
        const rootTitles = Object.keys(rootTitlesObject)
        multiLang.push(rootTitles)
        // checking for td-titles-descriptions
         
        isTdTitlesDescriptions.push({["root_title"]: isStringObjectKeyValue(td.title, rootTitlesObject)})
    }

    if (Object.prototype.hasOwnProperty.call(td, "descriptions")) {
        const rootDescriptionsObject = td.descriptions
        const rootDescriptions = Object.keys(rootDescriptionsObject)
        multiLang.push(rootDescriptions)
        // check whether description exists in descriptions
        if (Object.prototype.hasOwnProperty.call(td, "description")) {
             
            isTdTitlesDescriptions.push({["root_description"]: isStringObjectKeyValue(td.description, rootDescriptionsObject)})
        }
    }

    // checking inside each interaction
    if (Object.prototype.hasOwnProperty.call(td, "properties")) {
        // checking security in property level
        let tdProperties = Object.keys(td.properties)
        for (let i = 0; i < tdProperties.length; i++) {
            const curPropertyName = tdProperties[i]
            const curProperty = td.properties[curPropertyName]

            if (Object.prototype.hasOwnProperty.call(curProperty, "titles")) {
                const titlesKeys = Object.keys(curProperty.titles)
                multiLang.push(titlesKeys)
                // checking if title exists in titles
                if (Object.prototype.hasOwnProperty.call(curProperty, "title")) {
                    isTdTitlesDescriptions.push({
                        ["property_"+curPropertyName + "_title"]: isStringObjectKeyValue(curProperty.title, curProperty.titles)
                    })
                }
            }

            if (Object.prototype.hasOwnProperty.call(curProperty, "descriptions")) {
                const descriptionsKeys = Object.keys(curProperty.descriptions)
                multiLang.push(descriptionsKeys)
                // checking if description exists in descriptions
                if (Object.prototype.hasOwnProperty.call(curProperty, "description")) {
                    isTdTitlesDescriptions.push({
                    ["property_" + curPropertyName + "_desc"]: isStringObjectKeyValue(curProperty.description,curProperty.descriptions)
                    })
                }
            }
        }
    }

    if (Object.prototype.hasOwnProperty.call(td, "actions")) {
        // checking security in action level
        let tdActions = Object.keys(td.actions)
        for (let i = 0; i < tdActions.length; i++) {
            const curActionName = tdActions[i]
            const curAction = td.actions[curActionName]

            if (Object.prototype.hasOwnProperty.call(curAction, "titles")) {
                const titlesKeys = Object.keys(curAction.titles)
                multiLang.push(titlesKeys)
                // checking if title exists in titles
                if (Object.prototype.hasOwnProperty.call(curAction, "title")) {
                    isTdTitlesDescriptions.push({
                        ["action_" + curActionName + "_title"]: isStringObjectKeyValue(curAction.title, curAction.titles)
                    })
                }
            }

            if (Object.prototype.hasOwnProperty.call(curAction, "descriptions")) {
                const descriptionsKeys = Object.keys(curAction.descriptions)
                multiLang.push(descriptionsKeys)
                // checking if description exists in descriptions
                if (Object.prototype.hasOwnProperty.call(curAction, "description")) {
                    isTdTitlesDescriptions.push({
                         ["action_" + curActionName + "_desc"]: isStringObjectKeyValue(curAction.description, curAction.descriptions)
                    })
                }
            }

        }
    }

    if (Object.prototype.hasOwnProperty.call(td, "events")) {
        // checking security in event level
        let tdEvents = Object.keys(td.events)
        for (let i = 0; i < tdEvents.length; i++) {
            const curEventName = tdEvents[i]
            const curEvent = td.events[curEventName]

            if (Object.prototype.hasOwnProperty.call(curEvent, "titles")) {
                const titlesKeys = Object.keys(curEvent.titles)
                multiLang.push(titlesKeys)
                // checking if title exists in titles
                if (Object.prototype.hasOwnProperty.call(curEvent, "title")) {
                    isTdTitlesDescriptions.push({
                        ["event_" + curEventName + "_title"]: isStringObjectKeyValue(curEvent.title, curEvent.titles)
                    })
                }
            }

            if (Object.prototype.hasOwnProperty.call(curEvent, "descriptions")) {
                const descriptionsKeys = Object.keys(curEvent.descriptions)
                multiLang.push(descriptionsKeys)
                // checking if description exists in descriptions
                if (Object.prototype.hasOwnProperty.call(curEvent, "description")) {
                    isTdTitlesDescriptions.push({
                        ["event_" + curEventName + "_desc"]: isStringObjectKeyValue(curEvent.description, curEvent.descriptions)
                    })
                }
            }

        }
    }
    if(arrayArraysItemsEqual(multiLang)){
        results.push({
            "ID": "td-multi-languages-consistent",
            "Status": "pass"
        })
    } else {
        results.push({
            "ID": "td-multi-languages-consistent",
            "Status": "fail",
            "Comment": "not all multilang objects have same language tags"
        })
    }

    const flatArray = [] // this is multiLang but flat, so just a single array.
    // This way we can have scan the whole thing at once and then find the element that is not bcp47

    for (let index = 0; index < multiLang.length; index++) {
        let arrayElement = multiLang[index]
        arrayElement=JSON.parse(arrayElement)
        for (let e = 0; e < arrayElement.length; e++) {
            const stringElement = arrayElement[e]
            flatArray.push(stringElement)
        }
    }
    const isBCP47 = checkBCP47array(flatArray)
    if(isBCP47 === "ok"){
        results.push({
            "ID": "td-multilanguage-language-tag",
            "Status": "pass"
        })
    } else {
        results.push({
            "ID": "td-multilanguage-language-tag",
            "Status": "fail",
            "Comment":isBCP47+" is not a BCP47 tag"
        })
    }

    // // checking td-context-default-language-direction-script assertion
    // results.push({
    //     "ID": "td-context-default-language-direction-script",
    //     "Status": checkAzeri(flatArray)
    // })

    // checking td-titles-descriptions assertion
    // if there are no multilang, then it is not impl
    if(isTdTitlesDescriptions.length === 0){
        results.push({
            "ID": "td-titles-descriptions",
            "Status": "not-impl",
            "Comment": "no multilang objects in the td"
        })
        return results
    }

    // if at some point there was a false result, it is a fail
    for (let index = 0; index < isTdTitlesDescriptions.length; index++) {
        const element = isTdTitlesDescriptions[index]
        const elementName = Object.keys(element)

        if(element[elementName]){
            // do nothing it is correct
        } else {
            results.push({
                "ID": "td-titles-descriptions",
                "Status": "fail",
                "Comment": elementName+" is not on the multilang object at the same level"
            })
            return results
        }
    }
    // there was no problem, so just put pass
    results.push({
        "ID": "td-titles-descriptions",
        "Status": "pass"
    })

    // ? nothing after this, there is return above
    return results
}

/**
 * subfunction of checkMultiLangConsistency
 * checks if an array that contains only arrays as items is composed of same items
 *
 * @param {Array<object>} myArray The array to check
 */
function arrayArraysItemsEqual(myArray) {
    if(myArray.length === 0) return true
    // first stringify each array item
    for (let i = myArray.length; i--;) {
        myArray[i] = JSON.stringify(myArray[i])
    }

    for (let i = myArray.length; i--;) {
        if (i === 0) {
            return true
        }
        if (myArray[i] !== myArray[i - 1]){
            return false
        }
    }
}

/**
 * subfunction of checkMultiLangConsistency
 * checks whether the items of an array, which must be strings, are valid language tags
 *
 * @param {Array<string>} myArray The array, which items are to be checked
 */
function checkBCP47array(myArray){
    // return tag name if one is not valid during the check

    for (let index = 0; index < myArray.length; index++) {
        const element = myArray[index]
        if (bcp47pattern.test(element)) {
            // keep going
        } else {
            return element
        }
    }

    // return true if reached the end
    return "ok"
}

/**
 * subfunction of checkMultiLangConsistency
 * checks whether a given string exist as the value of key in an object
 *
 * @param {string} searchedString
 * @param {object} searchedObject
 */
function isStringObjectKeyValue(searchedString, searchedObject){
    const objKeys = Object.keys(searchedObject)
    if(objKeys.length === 0) return false // if the object is empty, then the string cannot exist here
    for (let index = 0; index < objKeys.length; index++) {
        const element = objKeys[index]
        if (searchedObject[element] === searchedString) {
            return true // found where the string is in the object
        } else {
            // nothing keep going, maybe in another key
        }
    }
    return false
}


/**
 * subfunction of checkMultiLangConsistency
 * checks whether an azeri language tag also specifies the version (Latn or Arab).
 * basically if the language is called "az", it is invalid, if it is az-Latn or az-Arab it is valid.
 *
 * @param {Array<string>} myMultiLangArray The language array to check
 */
// function checkAzeri(myMultiLangArray){
//     for (let index = 0; index < myMultiLangArray.length; index++) {
//         const element = myMultiLangArray[index]
//         if (element ==="az"){
//             return "fail"
//         } else if ((element === "az-Latn") || (element === "az-Arab")){
//             return "pass"
//         }
//     }
//     // no azeri, so it is not implemented
//     return "not-impl"
// }

// --------------------------------------------------

// -------------------------------------------------- checkLinksRelTypeCount

/**
 *  this checks whether rel:type appears only once in the links array
 *
 * @param {object} td The TD to do assertion tests
 */
function checkLinksRelTypeCount(td){

    const results = []

    if (Object.prototype.hasOwnProperty.call(td, "links")){
        // links exist, check if there is rel type
        let typeCount = 0
        for (let i = 0; i < td.links.length; i++) {
            const element = td.links[i]
            if(Object.prototype.hasOwnProperty.call(element, "rel")){
                if (element.rel === "type"){
                    typeCount++
                }
            }
        }
        if (typeCount === 0){
            results.push({
                "ID": "tm-rel-type-maximum",
                "Status": "not-impl",
                "Comment": "no rel:type in any link"
            })
        } else if (typeCount === 1){
            results.push({
                "ID": "tm-rel-type-maximum",
                "Status": "pass",
                "Comment": ""
            })
        } else {
            results.push({
                "ID": "tm-rel-type-maximum",
                "Status": "fail",
                "Comment": "too many rel:type in links array"
            })
        }
    } else {
        results.push({
            "ID": "tm-rel-type-maximum",
            "Status": "not-impl",
            "Comment": "no links array in the td"
        })
    }
    return results
}

/**
 * When you have apikey security with the key in uri, you put the name of the urivariable in the name field in
 * securityDefinitions. Ideally, that name appears in href as a uriVariable. See uriSecurity example
 * td-security-in-uri-variable: The URIs provided in interactions where a security scheme using uri as the value for
 * in MUST be a URI template including the defined variable.
 * Additionally, this also checks that the uriVariable used in the security does not conflict with ones for the TD
 * td-security-uri-variables-distinct: The names of URI variables declared in a SecurityScheme MUST be distinct from
 * all other URI variables declared in the TD.
 * @param {object} td The TD to do assertion tests
 */
function checkUriSecurity(td) {

    const results = []
    if (Object.prototype.hasOwnProperty.call(td, "securityDefinitions")) {
        const securityDefinitionsObject = td.securityDefinitions
        const securityDefinitionsNames = Object.keys(securityDefinitionsObject)

        const securityUriVariables = [];
        for (let index = 0; index < securityDefinitionsNames.length; index++) {
            const curSecurityDefinition = securityDefinitionsObject[securityDefinitionsNames[index]];
            if (curSecurityDefinition.scheme === "apikey"){
                if (Object.prototype.hasOwnProperty.call(curSecurityDefinition, "in")){
                    if (curSecurityDefinition.in === "uri"){
                        if (Object.prototype.hasOwnProperty.call(curSecurityDefinition, "name")){
                            securityUriVariables.push(curSecurityDefinition.name)
                        }
                    }
                }
            }
        }

        if (securityUriVariables.length === 0){ // we could not find any
            results.push({
                "ID": "td-security-in-uri-variable",
                "Status": "not-impl",
                "Comment": "no use of name in a uri apikey scheme"
            })
            results.push({
                "ID": "td-security-uri-variables-distinct",
                "Status": "not-impl",
                "Comment": "no use of name in a uri apikey scheme"
            })
            return results
        } else {
            let uriVariablesResult = "not-impl"
            let uriVariablesDistinctResult = "not-impl"
            let rootUriVariables = [];
            if (Object.prototype.hasOwnProperty.call(td, "uriVariables")) {
                rootUriVariables = Object.keys(td.uriVariables)
            }
            if (Object.prototype.hasOwnProperty.call(td, "properties")) {
                // checking security in property level
                let tdProperties = Object.keys(td.properties)
                for (let i = 0; i < tdProperties.length; i++) {
                    const curPropertyName = tdProperties[i]
                    const curProperty = td.properties[curPropertyName]
                    // checking href with uriVariable in forms level
                    const curForms = curProperty.forms
                    for (let j = 0; j < curForms.length; j++) {
                        const curForm = curForms[j]
                        if (Object.prototype.hasOwnProperty.call(curForm, "href")){
                            const curHref = curForm.href
                            // bottom thing is taken from https://stackoverflow.com/a/5582621/3806426
                            if (securityUriVariables.some(v => curHref.includes(v))) {
                                // There's at least one
                                if(uriVariablesResult !== "fail"){
                                    uriVariablesResult = "pass"
                                }
                            }
                        }
                    }
                    // part for the check of td-security-uri-variables-distinct
                    if (Object.prototype.hasOwnProperty.call(curProperty, "uriVariables")){
                        let curPropertyUriVariables = Object.keys(curProperty.uriVariables)
                        curPropertyUriVariables.push(...rootUriVariables)
                        if (curPropertyUriVariables.length>0){ // there are urivariables somewhere at least
                            // below is from https://stackoverflow.com/a/1885569/3806426
                            const filteredArray = curPropertyUriVariables.filter(value => securityUriVariables.includes(value))
                            // console.log(curPropertyUriVariables,"\n",securityUriVariables,"\n",filteredArray)
                            if(filteredArray.length>0){
                                uriVariablesDistinctResult = "fail"
                            } else {
                                if (uriVariablesDistinctResult !== "fail"){
                                    uriVariablesDistinctResult = "pass"
                                }
                            }
                        } // otherwise not-impl stays
                    }
                }
            }

            if (Object.prototype.hasOwnProperty.call(td, "actions")) {
                // checking security in property level
                let tdActions = Object.keys(td.actions)
                for (let i = 0; i < tdActions.length; i++) {
                    const curActionName = tdActions[i]
                    const curAction = td.actions[curActionName]
                    // checking href with uriVariable in forms level
                    const curForms = curAction.forms
                    for (let j = 0; j < curForms.length; j++) {
                        const curForm = curForms[j]
                        if (Object.prototype.hasOwnProperty.call(curForm, "href")){
                            const curHref = curForm.href
                            // bottom thing is taken from https://stackoverflow.com/a/5582621/3806426
                            if (securityUriVariables.some(v => curHref.includes(v))) {
                                // There's at least one
                                if(uriVariablesResult !== "fail"){
                                    uriVariablesResult = "pass"
                                }
                            }
                        }
                    }
                    // part for the check of td-security-uri-variables-distinct
                    if (Object.prototype.hasOwnProperty.call(curAction, "uriVariables")){
                        let curActionUriVariables = Object.keys(curAction.uriVariables)
                        curActionUriVariables.push(...rootUriVariables)
                        if (curActionUriVariables.length>0){ // there are urivariables somewhere at least
                            // below is from https://stackoverflow.com/a/1885569/3806426
                            const filteredArray = curActionUriVariables.filter(value => securityUriVariables.includes(value))
                            // console.log(curActionUriVariables,"\n",securityUriVariables,"\n",filteredArray)
                            if(filteredArray.length>0){
                                uriVariablesDistinctResult = "fail"
                            } else {
                                if (uriVariablesDistinctResult !== "fail"){
                                    uriVariablesDistinctResult = "pass"
                                }
                            }
                        } // otherwise not-impl stays
                    }
                }
            }

            if (Object.prototype.hasOwnProperty.call(td, "events")) {
                // checking security in property level
                let tdEvents = Object.keys(td.events)
                for (let i = 0; i < tdEvents.length; i++) {
                    const curEventName = tdEvents[i]
                    const curEvent = td.events[curEventName]
                    // checking href with uriVariable in forms level
                    const curForms = curEvent.forms
                    for (let j = 0; j < curForms.length; j++) {
                        const curForm = curForms[j]
                        if (Object.prototype.hasOwnProperty.call(curForm, "href")){
                            const curHref = curForm.href
                            // bottom thing is taken from https://stackoverflow.com/a/5582621/3806426
                            if (securityUriVariables.some(v => curHref.includes(v))) {
                                // There's at least one
                                if(uriVariablesResult !== "fail"){
                                    uriVariablesResult = "pass"
                                }
                            }
                        }
                    }
                    // part for the check of td-security-uri-variables-distinct
                    if (Object.prototype.hasOwnProperty.call(curEvent, "uriVariables")){
                        let curEventUriVariables = Object.keys(curEvent.uriVariables)
                        curEventUriVariables.push(...rootUriVariables)
                        if (curEventUriVariables.length>0){ // there are urivariables somewhere at least
                            // below is from https://stackoverflow.com/a/1885569/3806426
                            const filteredArray = curEventUriVariables.filter(value => securityUriVariables.includes(value))
                            // console.log(curEventUriVariables,"\n",securityUriVariables,"\n",filteredArray)
                            if(filteredArray.length>0){
                                uriVariablesDistinctResult = "fail"
                            } else {
                                if (uriVariablesDistinctResult !== "fail"){
                                    uriVariablesDistinctResult = "pass"
                                }
                            }
                        } // otherwise not-impl stays
                    }
                }
            }

            results.push({
                "ID": "td-security-in-uri-variable",
                "Status": uriVariablesResult
            })
            results.push({
                "ID": "td-security-in-uri-variable-distinct",
                "Status": uriVariablesDistinctResult
            })
            return results

        }

        // // no security used non defined scheme, passed test
        // results.push({
        //     "ID": "td-security-scheme-name",
        //     "Status": "pass"
        // })
        // return results

    }
    return results
}

/**
 * When tm:optional uses a pointer, it should point to an actual affordance and only to an affordance, as said by
 * tm-tmOptional-resolver: The JSON Pointers of tm:optional MUST resolve to an entire interaction affordance Map definition.
 * JSON Schema checks for the syntax but cannot know if the pointed affordance exists.
 * This function checks that programmatically
 * @param {object} td The TD to do assertion tests
 */
function checkTmOptionalPointer(td){
    const results = []
    if(Object.prototype.hasOwnProperty.call(td, "tm:optional")){
        td["tm:optional"].forEach(element => {
            // However, tm: optional values start with / so it should be removed first
            element = element.substring(1)
            element = element.replace("/",".") // since the resolvePath uses . instead of /
            const pathTarget = resolvePath(td,element,"noTarget")
            if (pathTarget === "noTarget" || pathTarget === undefined) {
                results.push({
                    "ID": "tm-tmOptional-resolver",
                    "Status": "fail",
                    "Comment": "tm:optional does not resolve to an affordance"
                })
            } else {
                results.push({
                    "ID": "tm-tmOptional-resolver",
                    "Status": "pass",
                    "Comment": ""
                })
            }
        });
    } else {
        results.push({
            "ID": "tm-tmOptional-resolver",
            "Status": "not-impl",
            "Comment": "no use of tm:optional"
        })
    }

    return results
 }
