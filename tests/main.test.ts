//math.test.ts
import * as test from "tape";
import { hello } from "../src/main"

test("Hello Default Test:: Returns Hello World!", (t) => {
    t.equal(hello(), "Hello World!");
    t.end();
});

test("Hello Input Test:: Returns Hello {input}!", (t) => {
    t.equal(hello("Friend"), "Hello Friend!");
    t.equal(hello("Compadre"), "Hello Compadre!");
    t.equal(hello("Comrade"), "Hello Comrade!");
    t.equal(hello("Freund"), "Hello Freund!");
    t.end();
});