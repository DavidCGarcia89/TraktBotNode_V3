import * as sinon from "sinon";
import { assert } from "chai";

describe("Some dummy test", () => {

    // function createAddress() {
    //     return {
    //         bot: {id: "1g975eghahbm8", name: "Bot"},
    //         channelId: "emulator",
    //         conversation: {id: "d4l0in50mgka"},
    //         id: "a8617a1124ek",
    //         serviceUrl: "http://localhost:50875",
    //         user: {id: "default-user", name: "User"}
    //     };
    // }

    const sandbox = sinon.createSandbox();

    beforeEach(() => {
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should always succeed", async () => {
        sandbox.assert.match(true, true);
    });
});
