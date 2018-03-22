'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const CompletionTrigger_1 = require("./CompletionTrigger");
/**
 * Waits for an Event to fire.
 *
 * @export
 * @class Event
 * @extends {CompletionTrigger}
 */
class Event extends CompletionTrigger_1.CompletionTrigger {
    /**
     * Creates an instance of the Event CompletionTrigger.
     * @param {string} event the name of the event to listen for.
     * @param {string} [cssSelector] the CSS selector of the element to listen on.
     *  Defaults to body.
     * @param {number} [timeout] ms to wait until timing out.
     * @memberof Event
     */
    constructor(event, cssSelector, timeout) {
        super(timeout);
        this.event = event;
        this.cssSelector = cssSelector;
    }
    wait(client) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const { Runtime } = client;
            const selector = this.cssSelector ? `querySelector('${this.cssSelector}')` : 'body';
            return Runtime.evaluate({
                awaitPromise: true,
                expression: `
        new Promise((resolve, reject) => {
          document.${selector}.addEventListener('${this.event}', resolve, { once: true });
          setTimeout(() => reject('${this.timeoutMessage}'), ${this.timeout});
        })`,
            });
        });
    }
}
exports.Event = Event;

//# sourceMappingURL=Event.js.map
