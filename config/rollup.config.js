import buble from 'rollup-plugin-buble';
import replace from 'rollup-plugin-replace';
// import typescript from 'rollup-plugin-typescript';
import typescript from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

var external = Object.keys(require('../package.json').dependencies);

export default config => {
  return {
    input: 'src/index.js',
    output: {
      format: config.format,
      file: config.dest
    },
    external: external,
    plugins: [
      resolve(),
      commonjs(),
      // typescript({
      //   rollupCommonJSResolveHack: true,
      // }),
      buble(),
      replace({'process.browser': JSON.stringify(!!config.browser)})
    ]
  };
};
