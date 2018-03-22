'use strict';

import * as Bluebird from 'bluebird';
import * as awaiter from 'cancelable-awaiter';
import {launch, LaunchedChrome} from 'chrome-launcher';
import * as CDP from 'chrome-remote-interface';
import * as tslib from 'tslib';

import * as CompletionTrigger from './CompletionTriggers';
import {CreateOptions} from './CreateOptions';
import {CreateResult} from './CreateResult';

try {
    Bluebird.config({cancellation: true});
} catch (err) {
    // was already configured
}

(tslib as any).__awaiter = awaiter;
type BluePromise<T> = Bluebird.Promise<T>;

const DEFAULT_CHROME_FLAGS = [
    '--disable-gpu',
    '--headless',
    '--hide-scrollbars',
];

enum ERROR_EVENT {
    DISCONNECT = 'disconnect',
    TARGET_CRASHED = 'Inspector.targetCrashed',
}

export {CompletionTrigger, CreateOptions, CreateResult};

/**
 * Generates a PDF from the given HTML string, launching Chrome as necessary.
 *
 * @export
 * @param {string} html the HTML string.
 * @param {Options} [options] the generation options.
 * @returns {Promise<CreateResult>} the generated PDF data.
 */
export async function create(html: string, options?: CreateOptions): Promise<CreateResult> {
    const myOptions = Object.assign({}, options);
    let chrome: LaunchedChrome;

    if (!myOptions.host && !myOptions.port) {
        chrome = await launchChrome(myOptions);
    }

    try {
        const tab = await CDP.New(myOptions);
        try {
            return await generate(html, myOptions, tab);
        } finally {
            try {
                await CDP.Close({...myOptions, id: tab.id});
            } catch (err) {
                //
            }
        }
    } finally {
        if (chrome) {
            await chrome.kill();
        }
    }
}

/**
 * Connects to Chrome and generates a PDF from HTML or a URL.
 *
 * @param {string} html the HTML string or URL.
 * @param {CreateOptions} options the generation options.
 * @param {any} tab the tab to use.
 * @returns {BluePromise<CreateResult>} the generated PDF data.
 */
async function generate(html: string, options: CreateOptions, tab: any): BluePromise<CreateResult> {
    const client = await CDP({...options, target: tab});

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

    return await promise.finally(() => {
        if (options._canceled != null) {
            return Promise.reject('Chrome daemon ' + options._canceled);
        }
    });
}

async function _generate(client: any, html: string, options: CreateOptions): BluePromise<CreateResult> {
    try {
        await beforeNavigate(options, client);
        const {Page} = client;
        if (/^(https?|file|data):/i.test(html)) {
            await Promise.all([
                Page.navigate({url: html}),
                Page.loadEventFired(),
            ]); // Resolve order varies
        } else {
            const {frameTree} = await Page.getResourceTree();
            await Promise.all([
                Page.setDocumentContent({html, frameId: frameTree.frame.id}),
                Page.loadEventFired(),
            ]); // Resolve order varies
        }
        await afterNavigate(options, client);
        // https://chromedevtools.github.io/debugger-protocol-viewer/tot/Page/#method-printToPDF
        const pdf = await Page.printToPDF(options.printOptions);
        return new CreateResult(pdf.data);

    } finally {
        client.close();
    }

}

/**
 * Code to execute before the page navigation.
 *
 * @param {CreateOptions} options the generation options.
 * @param {*} client the Chrome client.
 * @returns {Promise<void>} resolves if there we no errors or cancellations.
 */
async function beforeNavigate(options: CreateOptions, client: any): Promise<void> {
    const {Network, Page, Runtime} = client;
    if (options.clearCache) {
        await Network.clearBrowserCache();
    }
    // Enable events to be used here, in generate(), or in afterNavigate().
    await Promise.all([
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
        await Network.setCookies({cookies: options.cookies});
    }
}

/**
 * Code to execute after the page navigation.
 *
 * @param {CreateOptions} options the generation options.
 * @param {*} client the Chrome client.
 * @returns {Promise<void>} resolves if there we no errors or cancellations.
 */
async function afterNavigate(options: CreateOptions, client: any): Promise<void> {
    if (options.completionTrigger) {
        const waitResult = await options.completionTrigger.wait(client);
        if (waitResult && waitResult.exceptionDetails) {
            throw new Error(waitResult.result.value);
        }
    }
}

/**
 * Launches Chrome with the specified options.
 *
 * @param {CreateOptions} options the options for Chrome.
 * @returns {Promise<LaunchedChrome>} The launched Chrome instance.
 */
async function launchChrome(options: CreateOptions): Promise<LaunchedChrome> {
    const chrome = await launch({
        port: options.port,
        chromePath: options.chromePath,
        chromeFlags: options.chromeFlags || DEFAULT_CHROME_FLAGS,
    });
    options.port = chrome.port;
    return chrome;
}
