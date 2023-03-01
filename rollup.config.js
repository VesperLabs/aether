// rollup.config.js
import dotenv from "dotenv";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import babel from "@rollup/plugin-babel";
import scss from "rollup-plugin-scss";
dotenv.config();

const plugins = [
  commonjs({ include: "node_modules/**" }),
  nodeResolve({ jsnext: true, main: true, browser: true }),
  babel({
    exclude: "node_modules/**",
  }),
  replace({
    preventAssignment: true,
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.SERVER_PORT": JSON.stringify(process.env.SERVER_PORT),
    "process.env.SERVER_FPS": JSON.stringify(process.env.SERVER_FPS),
    "process.env.SERVER_URL": JSON.stringify(process.env.SERVER_URL),
    "process.env.GENERATE_SOURCEMAP": JSON.stringify(process.env.GENERATE_SOURCEMAP),
  }),
  scss(),
];

export default [
  {
    input: "./src/index.js",
    plugins,
    output: {
      file: "./public/bundle.min.js",
      format: "iife",
      sourcemap: true,
    },
  },
];
