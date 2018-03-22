'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Bluebird = require("bluebird");
const awaiter = require("cancelable-awaiter");
const chrome_launcher_1 = require("chrome-launcher");
const CDP = require("chrome-remote-interface");
const tslib = require("tslib");
const CompletionTrigger = require("./CompletionTriggers");
exports.CompletionTrigger = CompletionTrigger;
const CreateResult_1 = require("./CreateResult");
exports.CreateResult = CreateResult_1.CreateResult;
try {
    Bluebird.config({ cancellation: true });
}
catch (err) {
    // was already configured
}
tslib.__awaiter = awaiter;
const DEFAULT_CHROME_FLAGS = [
    '--disable-gpu',
    '--headless',
    '--hide-scrollbars',
];
var ERROR_EVENT;
(function (ERROR_EVENT) {
    ERROR_EVENT["DISCONNECT"] = "disconnect";
    ERROR_EVENT["TARGET_CRASHED"] = "Inspector.targetCrashed";
})(ERROR_EVENT || (ERROR_EVENT = {}));
/**
 * Generates a PDF from the given HTML string, launching Chrome as necessary.
 *
 * @export
 * @param {string} html the HTML string.
 * @param {Options} [options] the generation options.
 * @returns {Promise<CreateResult>} the generated PDF data.
 */
function create(html, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const myOptions = Object.assign({}, options);
        let chrome;
        if (!myOptions.host && !myOptions.port) {
            chrome = yield launchChrome(myOptions);
        }
        try {
            const tab = yield CDP.New(myOptions);
            try {
                return yield generate(html, myOptions, tab);
            }
            finally {
                try {
                    yield CDP.Close(Object.assign({}, myOptions, { id: tab.id }));
                }
                catch (err) {
                    //
                }
            }
        }
        finally {
            if (chrome) {
                yield chrome.kill();
            }
        }
    });
}
exports.create = create;
/**
 * Connects to Chrome and generates a PDF from HTML or a URL.
 *
 * @param {string} html the HTML string or URL.
 * @param {CreateOptions} options the generation options.
 * @param {any} tab the tab to use.
 * @returns {BluePromise<CreateResult>} the generated PDF data.
 */
function generate(html, options, tab) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const client = yield CDP(Object.assign({}, options, { target: tab }));
        const promise = _generate(client, html, options);
        if (options.errorHandler != null) {
            client.on('error', options.errorHandler);
        }
        client.on('event', (oEvent) => {
            if (options.eventHandler != null) {
                options.eventHandler(oEvent);
            }
            if (oEvent.method === ERROR_EVENT.TARGET_CRASHED) {
                options._canceled = ERROR_EVENT.TARGET_CRASHED;
                promise.cancel();
            }
        });
        client.once(ERROR_EVENT.DISCONNECT, () => {
            options._canceled = ERROR_EVENT.DISCONNECT;
            promise.cancel();
        });
        return yield promise.finally(() => {
            if (options._canceled != null) {
                return Promise.reject('Chrome daemon ' + options._canceled);
            }
        });
    });
}
function _generate(client, html, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            yield beforeNavigate(options, client);
            const { Page } = client;
            if (/^(https?|file|data):/i.test(html)) {
                yield Promise.all([
                    Page.navigate({ url: html }),
                    Page.loadEventFired(),
                ]); // Resolve order varies
            }
            else {
                const { frameTree } = yield Page.getResourceTree();
                yield Promise.all([
                    Page.setDocumentContent({ html, frameId: frameTree.frame.id }),
                    Page.loadEventFired(),
                ]); // Resolve order varies
            }
            yield afterNavigate(options, client);
            // https://chromedevtools.github.io/debugger-protocol-viewer/tot/Page/#method-printToPDF
            const pdf = yield Page.printToPDF(options.printOptions);
            return new CreateResult_1.CreateResult(pdf.data);
        }
        finally {
            client.close();
        }
    });
}
/**
 * Code to execute before the page navigation.
 *
 * @param {CreateOptions} options the generation options.
 * @param {*} client the Chrome client.
 * @returns {Promise<void>} resolves if there we no errors or cancellations.
 */
function beforeNavigate(options, client) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const { Network, Page, Runtime } = client;
        if (options.clearCache) {
            yield Network.clearBrowserCache();
        }
        // Enable events to be used here, in generate(), or in afterNavigate().
        yield Promise.all([
            Network.enable(),
            Page.enable(),
            Runtime.enable(),
        ]);
        if (options.runtimeConsoleHandler) {
            Runtime.consoleAPICalled(options.runtimeConsoleHandler);
        }
        if (options.runtimeExceptionHandler) {
            Runtime.exceptionThrown(options.runtimeExceptionHandler);
        }
        Network.requestWillBeSent((e) => {
            options._mainRequestId = options._mainRequestId || e.requestId;
        });
        Network.loadingFailed((e) => {
            if (e.requestId === options._mainRequestId) {
                options._navigateFailed = true;
            }
        });
        if (options.cookies) {
            yield Network.setCookies({ cookies: options.cookies });
        }
    });
}
/**
 * Code to execute after the page navigation.
 *
 * @param {CreateOptions} options the generation options.
 * @param {*} client the Chrome client.
 * @returns {Promise<void>} resolves if there we no errors or cancellations.
 */
function afterNavigate(options, client) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (options.completionTrigger) {
            const waitResult = yield options.completionTrigger.wait(client);
            if (waitResult && waitResult.exceptionDetails) {
                throw new Error(waitResult.result.value);
            }
        }
    });
}
/**
 * Launches Chrome with the specified options.
 *
 * @param {CreateOptions} options the options for Chrome.
 * @returns {Promise<LaunchedChrome>} The launched Chrome instance.
 */
function launchChrome(options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const chrome = yield chrome_launcher_1.launch({
            port: options.port,
            chromePath: options.chromePath,
            chromeFlags: options.chromeFlags || DEFAULT_CHROME_FLAGS,
        });
        options.port = chrome.port;
        return chrome;
    });
}

//# sourceMappingURL=index.js.map
