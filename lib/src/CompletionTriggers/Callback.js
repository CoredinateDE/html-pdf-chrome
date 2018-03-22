'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const CompletionTrigger_1 = require("./CompletionTrigger");
/**
 * Waits for a callback to be called.
 *
 * @export
 * @class Callback
 * @extends {CompletionTrigger}
 */
class Callback extends CompletionTrigger_1.CompletionTrigger {
    /**
     * Creates an instance of the Callback CompletionTrigger.
     * @param {string} [callbackName] the name of the callback to listen for.
     *  Defaults to htmlPdfCb.
     * @param {number} [timeout] ms to wait until timing out.
     * @memberof Callback
     */
    constructor(callbackName, timeout) {
        super(timeout);
        this.callbackName = callbackName;
    }
    wait(client) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const { Runtime } = client;
            const cbName = this.callbackName || 'htmlPdfCb';
            return Runtime.evaluate({
                awaitPromise: true,
                expression: `
        new Promise((resolve, reject) => {
          ${cbName} = resolve;
          setTimeout(() => reject('${this.timeoutMessage}'), ${this.timeout});
        })`,
            });
        });
    }
}
exports.Callback = Callback;

//# sourceMappingURL=Callback.js.map
