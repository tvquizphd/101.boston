import resolve from '@rollup/plugin-node-resolve';
import { cssModules } from 'rollup-plugin-css-modules';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import babel from '@rollup/plugin-babel';
import alias from '@rollup/plugin-alias';
import json from "@rollup/plugin-json";
import path from 'path';

export default {
  input: 'lib/index.js',
  plugins: [
    resolve({
      browser: true, 
      preferBuiltins: false
    }),
    alias({
      entries: [
        { find: '@lib', replacement: path.resolve(import.meta.dirname, 'lib') },
      ],
    }),
    babel({
      exclude: 'node_modules/**',
      babelHelpers: "bundled",
      presets: [
        [
          '@babel/env',
          {
            modules: false,
            targets: {
              browsers: '> 1%, IE 11, not op_mini all, not dead',
              node: 8
            },
            useBuiltIns: 'usage',
            corejs: 3
          }
        ]
      ]
    }),
    json(),
    commonjs(),
    cssModules(),
//    terser()
  ],
  output: {
    file: 'dist/bundle.js',
    format: 'es',
    sourcemap: false,
  }
};
