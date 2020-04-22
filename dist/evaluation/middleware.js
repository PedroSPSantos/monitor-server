"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const htmlparser = __importStar(require("htmlparser2"));
const CSSselect = __importStar(require("css-select"));
const lodash_clone_1 = __importDefault(require("lodash.clone"));
const qualweb = __importStar(require("./qualweb"));
const tests_1 = __importDefault(require("./tests"));
const testsColors_1 = __importDefault(require("./testsColors"));
const security_1 = require("../lib/security");
const mapping_1 = require("./mapping");
function generateScore(report) {
    let SS = 0;
    let PP = 0;
    for (const test in tests_1.default || {}) {
        const value = tests_1.default[test];
        if (report.data.elems.frame) {
            if (test in ['a_01b', 'a_02a', 'hx_01a', 'layout_01a', 'layout_02a']) {
                continue;
            }
        }
        let calc = false;
        switch (value['type']) {
            case 'true':
            case 'decr':
                if ((value['elem'] === 'all') || report.data['elems'][test] !== undefined) {
                    if (report.data['elems'][value['test']] !== undefined) {
                        calc = true;
                    }
                }
                break;
            case 'fals':
                if ((value['elem'] === 'all') || report.data['elems'][test]) {
                    if (report.data['elems'][value['test']] === undefined) {
                        calc = true;
                    }
                }
                break;
            case 'prop':
                if (report.data['elems'][test] && report.data['elems'][value['test']]) {
                    calc = true;
                }
                break;
        }
        if (calc) {
            const C = parseFloat(tests_1.default[test]['trust']);
            const E = report['data'].elems[test];
            const S = report['data'].elems[tests_1.default[test]['test']];
            let R = 0;
            let N = 0;
            for (const w of value['dis']) {
                if (w > 1) {
                    if (tests_1.default[test]['type'] === 'prop') {
                        R += +(w * C).toFixed(2);
                        const op = tests_1.default[test]['score'] * (1 - (S / E));
                        N = op < 1 ? 1 : op;
                    }
                    else if (tests_1.default[test]['type'] === 'decr') {
                        const T = tests_1.default[test]['top'];
                        const F = tests_1.default[test]['steps'];
                        const errors = S > T ? (S - T) / F : 0;
                        R += +(w * C).toFixed(2);
                        const op = (tests_1.default[test]['score'] - errors);
                        N = op < 1 ? 1 : op;
                    }
                    else if (tests_1.default[test]['type'] === 'true' || tests_1.default[test]['type'] === 'fals') {
                        R += +(w * C).toFixed(2);
                        N = tests_1.default[test]['score'];
                    }
                }
            }
            PP += +(R / 5).toFixed(2);
            SS += +(N * +(R / 5).toFixed(2)).toFixed(1);
        }
    }
    return (SS / PP).toFixed(1);
}
function calculateCssRules(evaluation) {
    const cssReport = evaluation.modules['css-techniques'];
    return Object.keys(cssReport.techniques).length;
}
function getHtmlLang(html) {
    let lang = '';
    let _dom = {};
    const handler = new htmlparser.DomHandler((error, dom) => {
        if (error) {
            throw new Error();
        }
        else {
            _dom = lodash_clone_1.default(dom);
        }
    });
    const parser = new htmlparser.Parser(handler);
    parser.write(html.replace(/(\r\n|\n|\r|\t)/gm, ''));
    parser.end();
    const htmlElement = CSSselect.selectOne('html', _dom);
    if (htmlElement && htmlElement.attribs && htmlElement.attribs.lang) {
        lang = htmlElement.attribs.lang;
    }
    return lang;
}
function calculateConform(results) {
    const errors = {
        A: 0,
        AA: 0,
        AAA: 0
    };
    for (const ee in results || {}) {
        if (ee) {
            let level = tests_1.default[ee]['level'].toUpperCase();
            if (testsColors_1.default[ee] === 'R') {
                errors[level]++;
            }
        }
    }
    return `${errors.A}@${errors.AA}@${errors.AAA}`;
}
function parseEvaluation(evaluation) {
    const { elements, results, nodes } = mapping_1.getElementsMapping(evaluation);
    const report = {};
    report.pagecode = evaluation.system.page.dom.processed.html.plain;
    report['data'] = {};
    report['data'].title = evaluation.system.page.dom.processed.title;
    report['data'].rawUrl = evaluation.system.url.completeUrl;
    report['data'].elems = lodash_clone_1.default(elements);
    report['data'].nodes = lodash_clone_1.default(nodes);
    report['data'].date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    report['data'].tot = {};
    report['data'].tot.info = {};
    report['data'].tot.info.url = lodash_clone_1.default(report['data'].rawUrl);
    report['data'].tot.info.title = lodash_clone_1.default(report['data'].title);
    report['data'].tot.info.date = lodash_clone_1.default(report['data'].date);
    report['data'].tot.info.htmlTags = evaluation.system.page.dom.processed.elementCount;
    report['data'].tot.info.size = encodeURI(report.pagecode).split(/%..|./).length - 1;
    report['data'].tot.info.cssRules = calculateCssRules(evaluation);
    report['data'].tot.info.encoding = 'utf-8';
    report['data'].tot.info.lang = getHtmlLang(evaluation.system.page.dom.processed.html.plain);
    report['data'].tot.info.content = 'text/html';
    report['data'].tot.info.hash = security_1.generateMd5Hash(report['data'].date);
    report['data'].tot.info.tests = Object.keys(results).length;
    report['data'].tot.elems = lodash_clone_1.default(report['data'].elems);
    report['data'].tot.results = lodash_clone_1.default(results);
    report['data'].conform = calculateConform(report['data'].tot.results);
    report['data'].tot.info.conform = lodash_clone_1.default(report['data'].conform);
    report['data'].score = generateScore(report);
    report['data'].tot.info.score = lodash_clone_1.default(report['data'].score);
    return report;
}
async function executeUrlEvaluation(url) {
    const evaluation = await qualweb.init({ url });
    return parseEvaluation(evaluation);
}
exports.executeUrlEvaluation = executeUrlEvaluation;
async function executeHtmlEvaluation(html) {
}
exports.executeHtmlEvaluation = executeHtmlEvaluation;
//# sourceMappingURL=middleware.js.map