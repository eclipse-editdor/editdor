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
import jsonld from 'jsonld';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import apply from 'ajv-formats-draft2019';
import lzs from 'lz-string';

import {
    checkPropUniqueness,
    checkSecurity,
    checkMultiLangConsistency,
    checkLinksRelTypeCount,
    checkUriSecurity,
    checkTmOptionalPointer
} from './shared';
import tdSchema from './td-schema.json';
import fullTdSchema from './td-schema-full.json';
import tmSchema from './tm-schema.json';

import jsonValidator from 'json-dup-key-validator';

export { tdValidator, tmValidator, compress, decompress, checkTypos }

/**
 * A function that provides the core functionality of the TD Playground.
 * @param {string} tdString The Thing Description to check as a string.
 * @param {function} logFunc (string) => void; Callback used to log the validation progress.
 * @param {object} options additional options, which checks should be executed
 * @returns {Promise<object>} Results of the validation as {report, details, detailComments} object
 */
function tdValidator(tdString, logFunc, { checkDefaults = true, checkJsonLd = true }) {
    return new Promise((res, rej) => {

        // check input
        if (typeof tdString !== "string") {
            rej("Thing Description input should be a String")
        }

        if (checkDefaults === undefined) {
            checkDefaults = true
        }
        if (checkJsonLd === undefined) {
            checkJsonLd = true
        }
        if (typeof logFunc !== "function") {
            rej("Expected logFunc to be a function")
        }

        // report that is returned by the function, possible values for every property:
        // null -> not tested, "passed", "failed", "warning"
        const report = {
            json: null,
            schema: null,
            defaults: null,
            jsonld: null,
            additional: null
        }
        // changing the two following objects implies adjusting the tests accordingly
        const details = {
            enumConst: null,
            propItems: null,
            security: null,
            propUniqueness: null,
            multiLangConsistency: null,
            linksRelTypeCount: null,
            readWriteOnly: null,
            uriVariableSecurity: null
        }

        const detailComments = {
            enumConst: "Checking whether a data schema has enum and const at the same time.",
            propItems: "Checking whether a data schema has an object but not properties or array but no items.",
            security: "Check if used Security definitions are properly defined previously.",
            propUniqueness: "Checking whether in one interaction pattern there are duplicate names, e.g. two properties called temp.",
            multiLangConsistency: "Checks whether all titles and descriptions have the same language fields.",
            linksRelTypeCount: "Checks whether rel:type is used more than once in the links array",
            readWriteOnly: "Warns if a property has readOnly or writeOnly set to true conflicting with another property.",
            uriVariableSecurity: "Checks if the name of an APIKey security scheme with in:uri show up in href and does not conflict with normal uriVariables"
        }

        const validationErrors = {
            json: null,
            schema: null
        }

        let tdJson
        try {
            tdJson = JSON.parse(tdString)
            report.json = "passed"
        } catch (err) {
            report.json = "failed"
            logFunc("X JSON validation failed:")
            validationErrors.json = err.message;
            logFunc(err)

            res({ report, details, detailComments, validationErrors })
        }

        let ajv = new Ajv({ strict: false }) // options can be passed, e.g. {allErrors: true}

        // ajv = addFormats(ajv) // ajv does not support formats by default anymore
        ajv = apply(ajv) // new formats that include iri


        ajv.addSchema(tdSchema, 'td')
        const valid = ajv.validate('td', tdJson)
        // used to be var valid = ajv.validate('td', e.detail);
        if (valid) {

            report.schema = "passed"

            // check with full schema
            if (checkDefaults) {
                ajv.addSchema(fullTdSchema, 'fulltd')
                const fullValid = ajv.validate('fulltd', tdJson)
                if (fullValid) {
                    report.defaults = "passed"
                } else {
                    report.defaults = "warning"
                    logFunc("Optional validation failed:")
                    logFunc("> " + ajv.errorsText(filterErrorMessages(ajv.errors)))
                    res({ report, details, detailComments, validationErrors })
                }
            }

            // do additional checks
            checkEnumConst(tdJson)
            checkPropItems(tdJson)
            checkReadWriteOnly(tdJson)
            details.security = evalAssertion(checkSecurity(tdJson))
            details.propUniqueness = evalAssertion(checkPropUniqueness(tdString))
            if (details.propUniqueness === "passed") {
                details.propUniqueness = checkSecPropUniqueness(tdString, tdJson)
            } else {
                checkSecPropUniqueness(tdString, tdJson)
            }
            details.multiLangConsistency = evalAssertion(checkMultiLangConsistency(tdJson))
            details.linksRelTypeCount = evalAssertion(checkLinksRelTypeCount(tdJson))
            details.uriVariableSecurity = evalAssertion(checkUriSecurity(tdJson))

            // determine additional check state
            // passed + warning -> warning
            // passed AND OR warning + error -> error
            report.additional = "passed"
            Object.keys(details).forEach(prop => {
                if (details[prop] === "warning" && report.additional === "passed") {
                    report.additional = "warning"
                } else if (details[prop] === "failed" && report.additional !== "failed") {
                    report.additional = "failed"
                }
            })

        } else {

            report.schema = "failed"
            logFunc("X JSON Schema validation failed:")
            validationErrors.schema = ajv.errorsText(filterErrorMessages(ajv.errors))
            logFunc('> ' + validationErrors.schema)

            res({ report, details, detailComments, validationErrors })
        }

        // json ld validation
        if (checkJsonLd) {
            jsonld.toRDF(tdJson, {
                format: 'application/nquads'
            }).then(nquads => {
                report.jsonld = "passed"
                res({ report, details, detailComments })
            }, err => {
                report.jsonld = "failed"
                logFunc("X JSON-LD validation failed:")
                logFunc("Hint: Make sure you have internet connection available.")
                logFunc('> ' + err)
                res({ report, details, detailComments })
            })
        } else {
            res({ report, details, detailComments })
        }


        // ************ functions ***************

        /** checking whether a data schema has enum and const at the same and displaying a warning in case there are */
        function checkEnumConst(td) {
            details.enumConst = "passed"
            if (Object.prototype.hasOwnProperty.call(td, "properties")) {
                // checking properties
                let tdProperties = Object.keys(td.properties)
                for (let i = 0; i < tdProperties.length; i++) {
                    const curPropertyName = tdProperties[i]
                    const curProperty = td.properties[curPropertyName]
                    if (Object.prototype.hasOwnProperty.call(curProperty, "enum") && Object.prototype.hasOwnProperty.call(curProperty, "const")) {
                        details.enumConst = "warning"
                        logFunc('! Warning: In property ' + curPropertyName +
                            ' enum and const are used at the same time, the values in enum' +
                            ' can never be valid in the received JSON value')
                    }
                }
            }
            // checking actions
            if (Object.prototype.hasOwnProperty.call(td, "actions")) {
                let tdActions = Object.keys(td.actions)
                for (let i = 0; i < tdActions.length; i++) {
                    const curActionName = tdActions[i]
                    const curAction = td.actions[curActionName]
                    if (Object.prototype.hasOwnProperty.call(curAction, "input")) {
                        const curInput = curAction.input
                        if (Object.prototype.hasOwnProperty.call(curInput, "enum") && Object.prototype.hasOwnProperty.call(curInput, "const")) {
                            details.enumConst = "warning"
                            logFunc('! Warning: In the input of action ' + curActionName +
                                ' enum and const are used at the same time, the values in enum can' +
                                ' never be valid in the received JSON value')
                        }
                    }
                    if (Object.prototype.hasOwnProperty.call(curAction, "output")) {
                        const curOutput = curAction.output
                        if (Object.prototype.hasOwnProperty.call(curOutput, "enum") && Object.prototype.hasOwnProperty.call(curOutput, "const")) {
                            details.enumConst = "warning"
                            logFunc('! Warning: In the output of action ' + curActionName +
                                ' enum and const are used at the same time, the values in enum can' +
                                ' never be valid in the received JSON value')

                        }
                    }
                }
            }
            // checking events
            if (Object.prototype.hasOwnProperty.call(td, "events")) {
                let tdEvents = Object.keys(td.events)
                for (let i = 0; i < tdEvents.length; i++) {
                    const curEventName = tdEvents[i]
                    const curEvent = td.events[curEventName]
                    if (Object.prototype.hasOwnProperty.call(curEvent, "enum") && Object.prototype.hasOwnProperty.call(curEvent, "const")) {
                        details.enumConst = "warning"
                        logFunc('! Warning: In event ' + curEventName +
                            ' enum and const are used at the same time, the' +
                            ' values in enum can never be valid in the received JSON value')
                    }
                }
            }
            return
        }

        /**
         * checking whether a data schema has object but not properties, array but no items
         * @param {object} td The TD under test
         */
        function checkPropItems(td) {
            details.propItems = "passed"

            if (Object.prototype.hasOwnProperty.call(td, "properties")) {
                // checking properties
                let tdProperties = Object.keys(td.properties)
                for (let i = 0; i < tdProperties.length; i++) {
                    const curPropertyName = tdProperties[i]
                    const curProperty = td.properties[curPropertyName]

                    if (Object.prototype.hasOwnProperty.call(curProperty, "type")) {
                        if ((curProperty.type === "object") && !(Object.prototype.hasOwnProperty.call(curProperty, "properties"))) {
                            details.propItems = "warning"
                            logFunc('! Warning: In property ' + curPropertyName +
                                ', the type is object but its properties are not specified')
                        }
                        if ((curProperty.type === "array") && !(Object.prototype.hasOwnProperty.call(curProperty, "items"))) {
                            details.propItems = "warning"
                            logFunc('! Warning: In property ' + curPropertyName +
                                ', the type is array but its items are not specified')
                        }
                    }
                }
            }
            // checking actions
            if (Object.prototype.hasOwnProperty.call(td, "actions")) {
                let tdActions = Object.keys(td.actions)
                for (let i = 0; i < tdActions.length; i++) {
                    const curActionName = tdActions[i]
                    const curAction = td.actions[curActionName]

                    if (Object.prototype.hasOwnProperty.call(curAction, "input")) {
                        const curInput = curAction.input
                        if (Object.prototype.hasOwnProperty.call(curInput, "type")) {
                            if ((curInput.type === "object") && !(Object.prototype.hasOwnProperty.call(curInput, "properties"))) {
                                details.propItems = "warning"
                                logFunc('! Warning: In the input of action ' + curActionName +
                                    ', the type is object but its properties are not specified')
                            }
                            if ((curInput.type === "array") && !(Object.prototype.hasOwnProperty.call(curInput, "items"))) {
                                details.propItems = "warning"
                                logFunc('! Warning: In the output of action ' + curActionName +
                                    ', the type is array but its items are not specified')
                            }
                        }
                    }
                    if (Object.prototype.hasOwnProperty.call(curAction, "output")) {
                        const curOutput = curAction.output
                        if (Object.prototype.hasOwnProperty.call(curOutput, "type")) {
                            if ((curOutput.type === "object") && !(Object.prototype.hasOwnProperty.call(curOutput, "properties"))) {
                                details.propItems = "warning"
                                logFunc('! Warning: In the output of action ' + curActionName +
                                    ', the type is object but its properties are not specified')
                            }
                            if ((curOutput.type === "array") && !(Object.prototype.hasOwnProperty.call(curOutput, "items"))) {
                                details.propItems = "warning"
                                logFunc('! Warning: In the output of action ' + curActionName +
                                    ', the type is array but its items are not specified')
                            }
                        }
                    }
                }
            }
            // checking events
            if (Object.prototype.hasOwnProperty.call(td, "events")) {
                let tdEvents = Object.keys(td.events)
                for (let i = 0; i < tdEvents.length; i++) {
                    const curEventName = tdEvents[i]
                    const curEvent = td.events[curEventName]

                    if (Object.prototype.hasOwnProperty.call(curEvent, "type")) {
                        if ((curEvent.type === "object") && !(Object.prototype.hasOwnProperty.call(curEvent, "properties"))) {
                            details.propItems = "warning"
                            logFunc('! Warning: In event ' + curEventName +
                                ', the type is object but its properties are not specified')
                        }
                        if ((curEvent.type === "array") && !(Object.prototype.hasOwnProperty.call(curEvent, "items"))) {
                            details.propItems = "warning"
                            logFunc('! Warning: In event ' + curEventName +
                                ', the type is array but its items are not specified')

                        }
                    }

                }
            }
            return
        }

        /**
         * Warns if a property has readOnly or writeOnly set to true conflicting with another property.
         * @param {object} td The TD under test
         */
        function checkReadWriteOnly(td) {
            details.readWriteOnly = "passed"

            if (Object.prototype.hasOwnProperty.call(td, "properties")) {
                // checking properties
                let tdProperties = Object.keys(td.properties)
                for (let i = 0; i < tdProperties.length; i++) {
                    const curPropertyName = tdProperties[i]
                    const curProperty = td.properties[curPropertyName]

                    // if readOnly is set
                    if (Object.prototype.hasOwnProperty.call(curProperty, "readOnly") && curProperty.readOnly === true) {
                        // check if both readOnly and writeOnly are true
                        if (Object.prototype.hasOwnProperty.call(curProperty, "writeOnly") && curProperty.writeOnly === true) {
                            details.readWriteOnly = "warning"
                            logFunc('! Warning: In property ' + curPropertyName +
                                ', both readOnly and writeOnly are set to true!')
                        }

                        // check forms if op writeProperty is set
                        if (Object.prototype.hasOwnProperty.call(curProperty, "forms")) {
                            for (const formElIndex in curProperty.forms) {
                                if (Object.prototype.hasOwnProperty.call(curProperty.forms, formElIndex)) {
                                    const formEl = curProperty.forms[formElIndex]
                                    if (Object.prototype.hasOwnProperty.call(formEl, "op")) {
                                        if ((typeof formEl.op === "string" && formEl.op === "writeproperty") ||
                                            (typeof formEl.op === "object" && formEl.op.some(el => (el === "writeproperty")))) {
                                            details.readWriteOnly = "warning"
                                            logFunc('! Warning: In property ' + curPropertyName + " in forms[" + formElIndex +
                                                '], readOnly is set but the op property contains "writeproperty"')
                                        }
                                    } else {
                                        details.readWriteOnly = "warning"
                                        logFunc('! Warning: In property ' + curPropertyName + " in forms[" + formElIndex +
                                            '], readOnly is set but a form op property defaults to ["writeproperty", "readproperty"]')
                                    }
                                }
                            }
                        }
                    }

                    // if writeOnly is set
                    if (Object.prototype.hasOwnProperty.call(curProperty, "writeOnly") && curProperty.writeOnly === true) {

                        // check forms if op readProperty is set
                        if (Object.prototype.hasOwnProperty.call(curProperty, "forms")) {
                            for (const formElIndex in curProperty.forms) {
                                if (Object.prototype.hasOwnProperty.call(curProperty.forms, formElIndex)) {
                                    const formEl = curProperty.forms[formElIndex]
                                    if (Object.prototype.hasOwnProperty.call(formEl, "op")) {
                                        if ((typeof formEl.op === "string" && formEl.op === "readproperty") ||
                                            (typeof formEl.op === "object" && formEl.op.some(el => (el === "readproperty")))) {
                                            details.readWriteOnly = "warning"
                                            logFunc('! Warning: In property ' + curPropertyName + " in forms[" + formElIndex +
                                                '], writeOnly is set but the op property contains "readproperty"')
                                        } else if ((typeof formEl.op === "string" && formEl.op === "observeproperty") ||
                                            (typeof formEl.op === "object" && formEl.op.some(el => (el === "observeproperty")))) {
                                            details.readWriteOnly = "warning"
                                            logFunc('! Warning: In property ' + curPropertyName + " in forms[" + formElIndex +
                                                '], writeOnly is set but the op property contains "observeproperty"')
                                        }
                                    } else {
                                        details.readWriteOnly = "warning"
                                        logFunc('! Warning: In property ' + curPropertyName + " in forms[" + formElIndex +
                                            '], writeOnly is set but a form op property defaults to ["writeproperty", "readproperty"]')
                                    }
                                }
                            }
                        }

                        // check if observable is also set
                        if (Object.prototype.hasOwnProperty.call(curProperty, "observable") && curProperty.observable === true) {
                            details.readWriteOnly = "warning"
                            logFunc('! Warning: In property ' + curPropertyName +
                                ', both writeOnly and observable are set to true!')
                        }
                    }
                }
            }
        }

        /**
         * Warns if security Definitions has no unique keys
         * @param {object} tdStr The TD under test as string
         */
        function checkSecPropUniqueness(tdStr, td) {

            let result = "passed"
            try {
                // checking whether there are securityDefinitions at all
                jsonValidator.parse(tdStr, false)
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
                const securitySchemeName = restString.slice(0, endQuote)

                if (Object.prototype.hasOwnProperty.call(td.securityDefinitions, securitySchemeName)) {
                    result = "failed"
                    logFunc("KO Error: The securityDefinitions contain a duplicate")
                }
            }

            return result
        }

        /**
         * Evaluates whether an assertion function contains a failed check
         * Whether assertions are not-implemented or passed does not matter
         * Logs the comment
         * @param {Array} results Array of objects with props "ID", "Status" and optionally "Comment"
         * @returns "passed" if no check failed, "failed" if one or more checks failed
         */
        function evalAssertion(results) {
            let out = "passed"
            results.forEach(resultobj => {
                if (resultobj.Status === "fail") {
                    out = "failed"
                    logFunc("KO Error: Assertion: " + resultobj.ID)
                    logFunc(resultobj.Comment)
                }
            })
            return out
        }

        /**
         * Removes duplicate error messages, as these are produced
         * otherwise, especially for "oneOf" schemes
         * @param {ajv.ErrorObject[]} errors
         */
        function filterErrorMessages(errors) {

            const output = []
            errors.forEach(el => {
                if (!output.some(ce => (ce.dataPath === el.dataPath && ce.message === el.message))) {
                    output.push(el)
                }
            })
            return output
        }
    })
}
/**
 * A function that provides the core functionality of the TD Playground.
 * @param {string} tmString The Thing Model to check as a string.
 * @param {function} logFunc (string) => void; Callback used to log the validation progress.
 * @param {object} options additional options, which checks should be executed
 * @returns {Promise<object>} Results of the validation as {report, details, detailComments} object
 */
function tmValidator(tmString, logFunc, { checkDefaults = true, checkJsonLd = true }) {
    return new Promise((res, rej) => {

        // check input
        if (typeof tmString !== "string") { rej("Thing Model input should be a String") }

        if (checkDefaults === undefined) {
            checkDefaults = true
        }
        if (checkJsonLd === undefined) {
            checkJsonLd = true
        }
        if (typeof logFunc !== "function") { rej("Expected logFunc to be a function") }

        // report that is returned by the function, possible values for every property:
        // null -> not tested, "passed", "failed", "warning"
        const report = {
            json: null,
            schema: null,
            defaults: null,
            jsonld: null,
            additional: null
        }
        // changing the two following objects implies adjusting the tests accordingly
        const details = {
            enumConst: null,
            propItems: null,
            propUniqueness: null,
            multiLangConsistency: null,
            linksRelTypeCount: null,
            readWriteOnly: null,
            tmOptionalPointer: null
        }

        const detailComments = {
            enumConst: "Checking whether a data schema has enum and const at the same time.",
            propItems: "Checking whether a data schema has an object but not properties or array but no items.",
            propUniqueness: "Checking whether in one interaction pattern there are duplicate names, e.g. two properties called temp.",
            multiLangConsistency: "Checks whether all titles and descriptions have the same language fields.",
            linksRelTypeCount: "Checks whether rel:type is used more than once in the links array",
            readWriteOnly: "Warns if a property has readOnly or writeOnly set to true conflicting with another property.",
            tmOptionalPointer: "Checking whether tm:optional points to an actual affordance"
        }

        let tmJson
        try {
            tmJson = JSON.parse(tmString)
            report.json = "passed"
        }
        catch (err) {
            report.json = "failed"
            logFunc("X JSON validation failed:")
            logFunc(err)

            res({ report, details, detailComments })
        }

        let ajv = new Ajv({ strict: false }) // options can be passed, e.g. {allErrors: true}
        ajv = addFormats(ajv) // ajv does not support formats by default anymore
        ajv = apply(ajv) // new formats that include iri

        ajv.addSchema(tmSchema, 'tm')
        const valid = ajv.validate('tm', tmJson)
        // used to be var valid = ajv.validate('td', e.detail);
        if (valid) {

            report.schema = "passed"

            // do additional checks
            checkEnumConst(tmJson)
            checkPropItems(tmJson)
            checkReadWriteOnly(tmJson)
            // ! no need to do security checking
            // details.security = evalAssertion(checkSecurity(tmJson))
            details.propUniqueness = evalAssertion(checkPropUniqueness(tmString))
            if (details.propUniqueness === "passed") {
                details.propUniqueness = checkSecPropUniqueness(tmString, tmJson)
            }
            else {
                checkSecPropUniqueness(tmString, tmJson)
            }
            details.multiLangConsistency = evalAssertion(checkMultiLangConsistency(tmJson))
            details.linksRelTypeCount = evalAssertion(checkLinksRelTypeCount(tmJson))
            details.tmOptionalPointer = evalAssertion(checkTmOptionalPointer(tmJson))

            // determine additional check state
            // passed + warning -> warning
            // passed AND OR warning + error -> error
            report.additional = "passed"
            Object.keys(details).forEach(prop => {
                if (details[prop] === "warning" && report.additional === "passed") {
                    report.additional = "warning"
                }
                else if (details[prop] === "failed" && report.additional !== "failed") {
                    report.additional = "failed"
                }
            })

        } else {

            report.schema = "failed"
            logFunc("X JSON Schema validation failed:")

            logFunc('> ' + ajv.errorsText(filterErrorMessages(ajv.errors)))

            res({ report, details, detailComments })
        }

        // json ld validation
        if (checkJsonLd) {
            jsonld.toRDF(tmJson, {
                format: 'application/nquads'
            }).then(nquads => {
                report.jsonld = "passed"
                res({ report, details, detailComments })
            }, err => {
                report.jsonld = "failed"
                logFunc("X JSON-LD validation failed:")
                logFunc("Hint: Make sure you have internet connection available.")
                logFunc('> ' + err)
                res({ report, details, detailComments })
            })
        }
        else {
            res({ report, details, detailComments })
        }


        // ************ functions ***************

        /** checking whether a data schema has enum and const at the same and displaying a warning in case there are */
        function checkEnumConst(tm) {
            details.enumConst = "passed"
            if (Object.prototype.hasOwnProperty.call(tm, "properties")) {
                // checking properties
                let tmProperties = Object.keys(tm.properties)
                for (let i = 0; i < tmProperties.length; i++) {
                    const curPropertyName = tmProperties[i]
                    const curProperty = tm.properties[curPropertyName]
                    if (Object.prototype.hasOwnProperty.call(curProperty, "enum") && Object.prototype.hasOwnProperty.call(curProperty, "const")) {
                        details.enumConst = "warning"
                        logFunc('! Warning: In property ' + curPropertyName +
                            ' enum and const are used at the same time, the values in enum' +
                            ' can never be valid in the received JSON value')
                    }
                }
            }
            // checking actions
            if (Object.prototype.hasOwnProperty.call(tm, "actions")) {
                let tmActions = Object.keys(tm.actions)
                for (let i = 0; i < tmActions.length; i++) {
                    const curActionName = tmActions[i]
                    const curAction = tm.actions[curActionName]
                    if (Object.prototype.hasOwnProperty.call(curAction, "input")) {
                        const curInput = curAction.input
                        if (Object.prototype.hasOwnProperty.call(curInput, "enum") && Object.prototype.hasOwnProperty.call(curInput, "const")) {
                            details.enumConst = "warning"
                            logFunc('! Warning: In the input of action ' + curActionName +
                                ' enum and const are used at the same time, the values in enum can' +
                                ' never be valid in the received JSON value')
                        }
                    }
                    if (Object.prototype.hasOwnProperty.call(curAction, "output")) {
                        const curOutput = curAction.output
                        if (Object.prototype.hasOwnProperty.call(curOutput, "enum") && Object.prototype.hasOwnProperty.call(curOutput, "const")) {
                            details.enumConst = "warning"
                            logFunc('! Warning: In the output of action ' + curActionName +
                                ' enum and const are used at the same time, the values in enum can' +
                                ' never be valid in the received JSON value')

                        }
                    }
                }
            }
            // checking events
            if (Object.prototype.hasOwnProperty.call(tm, "events")) {
                let tmEvents = Object.keys(tm.events)
                for (let i = 0; i < tmEvents.length; i++) {
                    const curEventName = tmEvents[i]
                    const curEvent = tm.events[curEventName]
                    if (Object.prototype.hasOwnProperty.call(curEvent, "enum") && Object.prototype.hasOwnProperty.call(curEvent, "const")) {
                        details.enumConst = "warning"
                        logFunc('! Warning: In event ' + curEventName +
                            ' enum and const are used at the same time, the' +
                            ' values in enum can never be valid in the received JSON value')
                    }
                }
            }
            return
        }

        /**
         * checking whether a data schema has object but not properties, array but no items
         * @param {object} tm The TD under test
         */
        function checkPropItems(tm) {
            details.propItems = "passed"

            if (Object.prototype.hasOwnProperty.call(tm, "properties")) {
                // checking properties
                let tmProperties = Object.keys(tm.properties)
                for (let i = 0; i < tmProperties.length; i++) {
                    const curPropertyName = tmProperties[i]
                    const curProperty = tm.properties[curPropertyName]

                    if (Object.prototype.hasOwnProperty.call(curProperty, "type")) {
                        if ((curProperty.type === "object") && !(Object.prototype.hasOwnProperty.call(curProperty, "properties"))) {
                            details.propItems = "warning"
                            logFunc('! Warning: In property ' + curPropertyName +
                                ', the type is object but its properties are not specified')
                        }
                        if ((curProperty.type === "array") && !(Object.prototype.hasOwnProperty.call(curProperty, "items"))) {
                            details.propItems = "warning"
                            logFunc('! Warning: In property ' + curPropertyName +
                                ', the type is array but its items are not specified')
                        }
                    }
                }
            }
            // checking actions
            if (Object.prototype.hasOwnProperty.call(tm, "actions")) {
                let tmActions = Object.keys(tm.actions)
                for (let i = 0; i < tmActions.length; i++) {
                    const curActionName = tmActions[i]
                    const curAction = tm.actions[curActionName]

                    if (Object.prototype.hasOwnProperty.call(curAction, "input")) {
                        const curInput = curAction.input
                        if (Object.prototype.hasOwnProperty.call(curInput, "type")) {
                            if ((curInput.type === "object") && !(Object.prototype.hasOwnProperty.call(curInput, "properties"))) {
                                details.propItems = "warning"
                                logFunc('! Warning: In the input of action ' + curActionName +
                                    ', the type is object but its properties are not specified')
                            }
                            if ((curInput.type === "array") && !(Object.prototype.hasOwnProperty.call(curInput, "items"))) {
                                details.propItems = "warning"
                                logFunc('! Warning: In the output of action ' + curActionName +
                                    ', the type is array but its items are not specified')
                            }
                        }
                    }
                    if (Object.prototype.hasOwnProperty.call(curAction, "output")) {
                        const curOutput = curAction.output
                        if (Object.prototype.hasOwnProperty.call(curOutput, "type")) {
                            if ((curOutput.type === "object") && !(Object.prototype.hasOwnProperty.call(curOutput, "properties"))) {
                                details.propItems = "warning"
                                logFunc('! Warning: In the output of action ' + curActionName +
                                    ', the type is object but its properties are not specified')
                            }
                            if ((curOutput.type === "array") && !(Object.prototype.hasOwnProperty.call(curOutput, "items"))) {
                                details.propItems = "warning"
                                logFunc('! Warning: In the output of action ' + curActionName +
                                    ', the type is array but its items are not specified')
                            }
                        }
                    }
                }
            }
            // checking events
            if (Object.prototype.hasOwnProperty.call(tm, "events")) {
                let tmEvents = Object.keys(tm.events)
                for (let i = 0; i < tmEvents.length; i++) {
                    const curEventName = tmEvents[i]
                    const curEvent = tm.events[curEventName]

                    if (Object.prototype.hasOwnProperty.call(curEvent, "type")) {
                        if ((curEvent.type === "object") && !(Object.prototype.hasOwnProperty.call(curEvent, "properties"))) {
                            details.propItems = "warning"
                            logFunc('! Warning: In event ' + curEventName +
                                ', the type is object but its properties are not specified')
                        }
                        if ((curEvent.type === "array") && !(Object.prototype.hasOwnProperty.call(curEvent, "items"))) {
                            details.propItems = "warning"
                            logFunc('! Warning: In event ' + curEventName +
                                ', the type is array but its items are not specified')

                        }
                    }

                }
            }
            return
        }

        /**
         * Warns if a property has readOnly or writeOnly set to true conflicting with another property.
         * @param {object} tm The TD under test
         */
        function checkReadWriteOnly(tm) {
            details.readWriteOnly = "passed"

            if (Object.prototype.hasOwnProperty.call(tm, "properties")) {
                // checking properties
                let tmProperties = Object.keys(tm.properties)
                for (let i = 0; i < tmProperties.length; i++) {
                    const curPropertyName = tmProperties[i]
                    const curProperty = tm.properties[curPropertyName]

                    // if readOnly is set
                    if (Object.prototype.hasOwnProperty.call(curProperty, "readOnly") && curProperty.readOnly === true) {
                        // check if both readOnly and writeOnly are true
                        if (Object.prototype.hasOwnProperty.call(curProperty, "writeOnly") && curProperty.writeOnly === true) {
                            details.readWriteOnly = "warning"
                            logFunc('! Warning: In property ' + curPropertyName +
                                ', both readOnly and writeOnly are set to true!')
                        }

                        // check forms if op writeProperty is set
                        if (Object.prototype.hasOwnProperty.call(curProperty, "forms")) {
                            for (const formElIndex in curProperty.forms) {
                                if (Object.prototype.hasOwnProperty.call(curProperty.forms, formElIndex)) {
                                    const formEl = curProperty.forms[formElIndex]
                                    if (Object.prototype.hasOwnProperty.call(formEl, "op")) {
                                        if ((typeof formEl.op === "string" && formEl.op === "writeproperty") ||
                                            (typeof formEl.op === "object" && formEl.op.some(el => (el === "writeproperty")))) {
                                            details.readWriteOnly = "warning"
                                            logFunc('! Warning: In property ' + curPropertyName + " in forms[" + formElIndex +
                                                '], readOnly is set but the op property contains "writeproperty"')
                                        }
                                    }
                                    else {
                                        details.readWriteOnly = "warning"
                                        logFunc('! Warning: In property ' + curPropertyName + " in forms[" + formElIndex +
                                            '], readOnly is set but a form op property defaults to ["writeproperty", "readproperty"]')
                                    }
                                }
                            }
                        }
                    }

                    // if writeOnly is set
                    if (Object.prototype.hasOwnProperty.call(curProperty, "writeOnly") && curProperty.writeOnly === true) {

                        // check forms if op readProperty is set
                        if (Object.prototype.hasOwnProperty.call(curProperty, "forms")) {
                            for (const formElIndex in curProperty.forms) {
                                if (Object.prototype.hasOwnProperty.call(curProperty.forms, formElIndex)) {
                                    const formEl = curProperty.forms[formElIndex]
                                    if (Object.prototype.hasOwnProperty.call(formEl, "op")) {
                                        if ((typeof formEl.op === "string" && formEl.op === "readproperty") ||
                                            (typeof formEl.op === "object" && formEl.op.some(el => (el === "readproperty")))) {
                                            details.readWriteOnly = "warning"
                                            logFunc('! Warning: In property ' + curPropertyName + " in forms[" + formElIndex +
                                                '], writeOnly is set but the op property contains "readproperty"')
                                        }
                                        else if ((typeof formEl.op === "string" && formEl.op === "observeproperty") ||
                                            (typeof formEl.op === "object" && formEl.op.some(el => (el === "observeproperty")))) {
                                            details.readWriteOnly = "warning"
                                            logFunc('! Warning: In property ' + curPropertyName + " in forms[" + formElIndex +
                                                '], writeOnly is set but the op property contains "observeproperty"')
                                        }
                                    }
                                    else {
                                        details.readWriteOnly = "warning"
                                        logFunc('! Warning: In property ' + curPropertyName + " in forms[" + formElIndex +
                                            '], writeOnly is set but a form op property defaults to ["writeproperty", "readproperty"]')
                                    }
                                }
                            }
                        }

                        // check if observable is also set
                        if (Object.prototype.hasOwnProperty.call(curProperty, "observable") && curProperty.observable === true) {
                            details.readWriteOnly = "warning"
                            logFunc('! Warning: In property ' + curPropertyName +
                                ', both writeOnly and observable are set to true!')
                        }
                    }
                }
            }
        }

        /**
         * Warns if security Definitions has no unique keys
         * @param {object} tmStr The TD under test as string
         */
        function checkSecPropUniqueness(tmStr, tm) {

            let result = "passed"
            try {
                // checking whether there are securityDefinitions at all
                jsonValidator.parse(tmStr, false)
            }
            catch (error) {
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
                const securitySchemeName = restString.slice(0, endQuote)

                if (Object.prototype.hasOwnProperty.call(tm.securityDefinitions, securitySchemeName)) {
                    result = "failed"
                    logFunc("KO Error: The securityDefinitions contain a duplicate")
                }
            }

            return result
        }

        /**
         * Evaluates whether an assertion function contains a failed check
         * Whether assertions are not-implemented or passed does not matter
         * Logs the comment
         * @param {Array} results Array of objects with props "ID", "Status" and optionally "Comment"
         * @returns "passed" if no check failed, "failed" if one or more checks failed
         */
        function evalAssertion(results) {
            let out = "passed"
            results.forEach(resultobj => {
                if (resultobj.Status === "fail") {
                    out = "failed"
                    logFunc("KO Error: Assertion: " + resultobj.ID)
                    logFunc(resultobj.Comment)
                }
            })
            return out
        }

        /**
         * Removes duplicate error messages, as these are produced
         * otherwise, especially for "oneOf" schemes
         * @param {ajv.ErrorObject[]} errors
         */
        function filterErrorMessages(errors) {

            const output = []
            errors.forEach(el => {
                if (!output.some(ce => (ce.dataPath === el.dataPath && ce.message === el.message))) {
                    output.push(el)
                }
            })
            return output
        }
    })
}

/**
 * Transform an arbitrary string to another compressed URL-encoded string.
 * @param {string} data String to compress.
 * @returns {string} Compressed URL-encoded string.
 */
function compress(data) {
    return lzs.compressToEncodedURIComponent(data);
}

/**
 * Decompress a string compressed with the {@link compress} method.
 * @param {string} data Compressed URL-encoded string.
 * @returns {string} Original string.
 */
function decompress(data) {
    return lzs.decompressFromEncodedURIComponent(data);
}

// --------------------------------------------------

// -------------------------------------------------- checkTypos

const REF = "$ref"
const PROPERTIES = "properties"
const ADDITONAL_PROPERTIES = "additional_properties"
const DATA_SCHEMA = "dataSchema"
const PATH = "#/"
const TYPO_LOOKUP_TABLE = createSchemaLookupTable(tdSchema)

/**
 * Checks possible typos in a TD
 * @param {object} td The TD to apply typo check on
 * @returns List of possible typos where the typo consists of string value of typo itself and the message, another string value, to be prompted to the user for the fix
 */
function checkTypos(td) {
    const typos = []

    const lookupTable = TYPO_LOOKUP_TABLE
    const searchDepth = 1
    const searchPath = PATH
    let tdJson = {}

    try {
        tdJson = JSON.parse(td)
    } catch (err) {
        console.log("Error occurred while parsing JSON!")
    }

    searchTypos(typos, tdJson, lookupTable, searchDepth, searchPath)

    return typos
}

/**
 * Searching typos on a specific path and depth
 * @param {Array} typos The list that typo objects are stored
 * @param {object} tdJson JSON object of the TD
 * @param {Map} lookupTable The map that stores paths and their available word list according to their path depth
 * @param {integer} searchDepth The integer that decides the depth of the typo check search
 * @param {string} searchPath The string that decided the path of the typo check search
 */
function searchTypos(typos, tdJson, lookupTable, searchDepth, searchPath) {
    for (const key in tdJson) {
        if (Object.prototype.hasOwnProperty.call(tdJson, key)) {
            const pathMap = lookupTable.get(searchDepth)
            const wordSet = pathMap.get(searchPath)

            if (wordSet.has(key)) {
                continue
            }

            wordSet.forEach(word => {
                if (doesTypoExist(key, word)) {
                    typos.push({
                        word: key,
                        message: `Did you mean ${word}?`
                    })

                    return
                }
            })
        }
    }
}

/**
 * Creates a lookup table using JSON schema
 * @param {object} jsonSchema JSON Schema to create a lookup table from
 * @returns The map that constructs lookup table for typo check using TD Schema
 */
function createSchemaLookupTable(jsonSchema) {
    const lookupTable = new Map()
    const filteredLookupTable = new Map()

    findPathsInSchema(lookupTable, jsonSchema, PATH)

    lookupTable.forEach((value, key) => {
        if (value.size > 0) {
            const pathDepth = (key.match(/\//ig) || []).length

            let pathDepthMap = filteredLookupTable.get(pathDepth)

            if (pathDepthMap) {
                pathDepthMap.set(key.replace(/^r/g, ''), value)
                filteredLookupTable.set(pathDepth, pathDepthMap)
            } else {
                pathDepthMap = new Map()
                pathDepthMap.set(key.replace(/^r/g, ''), value)
                filteredLookupTable.set(pathDepth, pathDepthMap)
            }
        }
    })

    return filteredLookupTable
}

/**
 * Finds the paths under a parent path by parsing schema and adds them to a lookup table
 * @param {Map} lookupTable The map that stores the paths in the schema
 * @param {object} schema The schema to find the paths from
 * @param {string} path The parent path that search is going under
 */
function findPathsInSchema(lookupTable, schema, path) {
    const keys = new Set()

    if (schema[REF]) {
        if (path[0] === 'r' && schema[REF].includes(DATA_SCHEMA)) {
            return
        }

        if (schema[REF].includes(DATA_SCHEMA)) {
            path = 'r' + path
        }

        findPathsInSchema(getRefObjectOfSchema(tdSchema, schema[REF]), path)
        return
    }

    if (schema['type'] === 'object') {
        const properties = schema[PROPERTIES]
        for (const key in properties) {
            if (Object.prototype.hasOwnProperty.call(properties, key)) {
                if (key === REF) {
                    if (path[0] === 'r' && properties[key].includes(DATA_SCHEMA)) {
                        continue
                    }

                    if (properties[key].includes(DATA_SCHEMA)) {
                        path = 'r' + path
                    }

                    findPathsInSchema(getRefObjectOfSchema(tdSchema, properties[key]), path)
                    return
                } else {
                    findPathsInSchema(properties[key], `${path}${key}/`)
                    keys.add(key)
                }
            }
        }

        const additionalProperties = schema[ADDITONAL_PROPERTIES]
        for (const key in additionalProperties) {
            if (Object.prototype.hasOwnProperty.call(additionalProperties, key)) {
                if (key === REF) {
                    if (path[0] === 'r' && additionalProperties[key].includes(DATA_SCHEMA)) {
                        continue
                    }

                    if (additionalProperties[key].includes(DATA_SCHEMA)) {
                        path = 'r' + path
                    }

                    findPathsInSchema(getRefObjectOfSchema(tdSchema, additionalProperties[key]), `${path}*/`)
                    return
                }
            }
        }

        putKeysToPath(lookupTable, path, keys)
    }

    if (schema['type'] === 'array') {
        const items = schema['items']

        for (const item in items) {
            if (Object.prototype.hasOwnProperty.call(items, item)) {
                if (item === REF) {
                    if (path[0] === 'r' && items[item].includes(DATA_SCHEMA)) {
                        continue
                    }

                    if (items[item].includes(DATA_SCHEMA)) {
                        path = 'r' + path
                    }

                    findPathsInSchema(getRefObjectOfSchema(tdSchema, items[item]), path)
                    return
                }
            }
        }

        putKeysToPath(lookupTable, path, keys)
    }

    for (const key in schema) {
        if (Object.prototype.hasOwnProperty.call(schema, key)) {
            if (['allOf', 'oneOf', 'anyOf'].includes(key)) {
                if (Array.isArray(schema[key])) {
                    schema[key].forEach(element => {
                        findPathsInSchema(element, path)
                    })
                }
            }
        }
    }
}

/**
 * Stores the keys under a specific path
 * @param {Map} lookupTable The map that stores the paths in the schema
 * @param {string} path The path that is owner of the current keys
 * @param {Set} keys The set of keys that is going to be put
 */
function putKeysToPath(lookupTable, path, keys) {
    let pathKeys = lookupTable.get(path)

    if (pathKeys) {
        const union = new Set(pathKeys)
        keys.forEach(k => {
            union.add(k)
        })

        lookupTable.set(path, union)
    } else {
        lookupTable.set(path, keys)
    }
}

/**
 * Gets the reference object in the schema
 * @param {object} schema The object that represent the schema
 * @param {string} ref The reference value in the schema
 * @returns The reference object the ref maps to
 */
function getRefObjectOfSchema(schema, ref) {
    const splitRef = ref.split('/')
    if (splitRef[0] !== '#') {
        console.log('Parsing not implemented for between files')
        return
    }

    let result = schema

    for (let i = 1; i < splitRef.length; i++) {
        result = result[splitRef[i]]
    }

    return result
}

// Minimum similarity value to be able to say that two words are similar
const SIMILARITY_THRESHOLD = 0.85

// Maximum value of length difference between two words
const MAX_LENGTH_DIFFERENCE = 2

/**
 * Checks whether typo exists or not by comparing similarity of the two words
 * @param {string} actual The property name of the TD entered by user
 * @param {string} desired The desired property name that is retrieved from TD Schema
 * @returns Boolean value that tell whether typo exists or not
 */
function doesTypoExist(actual, desired) {
    if (Math.abs(actual.length - desired.length) > MAX_LENGTH_DIFFERENCE) {
        return false
    }

    const similarity = calculateSimilarity(actual, desired)
    return similarity > SIMILARITY_THRESHOLD && similarity !== 1.0
}

/**
 * Similarity of words calculated using Jaro-Winkler algorithm
 * @param {string} actual The property name of the TD entered by user
 * @param {string} desired The desired propert name that is retrieved from TD Schema
 * @returns Similarity of value the two inputs
 */
function calculateSimilarity(actual, desired) {
    let m = 0

    if (actual.length === 0 || desired.length === 0) {
        return 0
    }

    if (actual === desired) {
        return 1
    }

    const range = Math.floor(Math.max(actual.length, desired.length) / 2) - 1
    const actualMatches = new Array(actual.length)
    const desiredMatches = new Array(desired.length)

    // check lower and upper bounds to find the matches
    for (let i = 0; i < actual.length; i++) {
        const lowerBound = (i >= range) ? i - range : 0
        const upperBound = (i + range <= desired.length) ? (i + range) : (desired.length - 1)

        for (let j = lowerBound; j <= upperBound; j++) {
            if (actualMatches[i] !== true && desiredMatches[j] !== true && actual[i] === desired[j]) {
                m++
                actualMatches[i] = desiredMatches[j] = true
                break
            }
        }
    }

    if (m === 0) {
        return 0
    }

    let k = 0
    let transpositionCount = 0

    // count transpositions
    for (let i = 0; i < actual.length; i++) {
        if (actualMatches[i] === true) {
            let j = 0
            for (j = k; j < desired.length; j++) {
                if (desiredMatches[j] === true) {
                    k = j + 1
                    break
                }
            }

            if (actual[i] !== desired[j]) {
                transpositionCount++
            }
        }
    }

    let similarity = ((m / actual.length) + (m / desired.length) + ((m - (transpositionCount / 2)) / m)) / 3
    let l = 0
    const p = 0.1

    // strengthen the similarity if the words start with same letters
    if (similarity < 0.7) {
        while (actual[l] === desired[l] && l < 4) {
            l++
        }

        similarity = similarity + l * p * (1 - similarity)
    }

    return similarity
}
