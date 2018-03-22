'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs = require("fs");
const stream_1 = require("stream");
/**
 * Allows exporting of PDF data to multiple formats.
 *
 * @export
 * @class CreateResult
 */
class CreateResult {
    /**
     * Writes the given data Buffer to the specified file location.
     *
     * @private
     * @static
     * @param {string} filename the file name to write to.
     * @param {Buffer} data the data to write.
     * @returns {Promise<void>}
     *
     * @memberof CreateResult
     */
    static writeFile(filename, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                fs.writeFile(filename, data, (err) => {
                    err ? reject(err) : resolve();
                });
            });
        });
    }
    /**
     * Creates an instance of CreateResult.
     * @param {string} data base64 PDF data
     *
     * @memberof CreateResult
     */
    constructor(data) {
        this.data = data;
    }
    /**
     * Get the base64 PDF data.
     *
     * @returns {string} base64 PDF data.
     *
     * @memberof CreateResult
     */
    toBase64() {
        return this.data;
    }
    /**
     * Get a Buffer of the PDF data.
     *
     * @returns {Buffer} PDF data.
     *
     * @memberof CreateResult
     */
    toBuffer() {
        return Buffer.from(this.data, 'base64');
    }
    /**
     * Get a Stream of the PDF data.
     *
     * @returns {Stream} Stream of PDF data.
     *
     * @memberof CreateResult
     */
    toStream() {
        const stream = new stream_1.Readable();
        stream.push(this.data, 'base64');
        stream.push(null);
        return stream;
    }
    /**
     * Saves the PDF to a file.
     *
     * @param {string} filename the filename.
     * @returns {Promise<void>} resolves upon successful create.
     *
     * @memberof CreateResult
     */
    toFile(filename) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield CreateResult.writeFile(filename, this.toBuffer());
        });
    }
}
exports.CreateResult = CreateResult;

//# sourceMappingURL=CreateResult.js.map
