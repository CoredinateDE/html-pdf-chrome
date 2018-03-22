'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const CompletionTrigger_1 = require("./CompletionTrigger");
/**
 * Waits for a specified amount of time.
 *
 * @export
 * @class Timer
 * @extends {CompletionTrigger}
 */
class Timer extends CompletionTrigger_1.CompletionTrigger {
    /**
     * Creates an instance of the Timer CompletionTrigger.
     * @param {number} timeout ms to wait until timing out.
     * @memberof Timer
     */
    constructor(timeout) {
        super(timeout);
    }
    wait() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                setTimeout(resolve, this.timeout);
            });
        });
    }
}
exports.Timer = Timer;

//# sourceMappingURL=Timer.js.map
