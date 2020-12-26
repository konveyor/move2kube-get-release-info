import { get_major_minor_patch } from "../src/utils";
import * as process from "process";
import * as cp from "child_process";
import * as path from "path";

test("get_major_minor_patch with valid input", async () => {
  const input = "v0.1.0-rc.3";
  const actual = get_major_minor_patch(input);
  const want = "0.1.0";
  await expect(actual).toBe(want);
});

test("get_major_minor_patch with invalid input", async () => {
  const input = "release-0.1";
  const actual = get_major_minor_patch(input);
  const want = "";
  await expect(actual).toBe(want);
});

test("test run on kubernetes/kubernetes", () => {
  process.env["INPUT_OWNER"] = "kubernetes";
  process.env["INPUT_REPO"] = "kubernetes";
  const np = process.execPath;
  const ip = path.join(__dirname, "..", "lib", "main.js");
  const options: cp.ExecFileSyncOptions = { env: process.env };
  console.log("running np:", np, "ip:", ip, "options:", options);
  const output = cp.execFileSync(np, [ip], options).toString();
  console.log(output);
});

test("test run on konveyor/move2kube", () => {
  process.env["INPUT_OWNER"] = "konveyor";
  process.env["INPUT_REPO"] = "move2kube";
  const np = process.execPath;
  const ip = path.join(__dirname, "..", "lib", "main.js");
  const options: cp.ExecFileSyncOptions = { env: process.env };
  console.log("running np:", np, "ip:", ip, "options:", options);
  const output = cp.execFileSync(np, [ip], options).toString();
  console.log(output);
});
