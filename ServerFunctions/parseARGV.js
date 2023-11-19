/**
 * @param {Array<String>} argv
 */
function parseARGV(argv) {
  let out = {
    flags: [],
    options: []
  };
  for (const value of argv) {
    if (value.includes("=")) {
      const temp = value.split("=");
      out.options.push({
        key: temp[0],
        value: temp[1]
      });
    } else {
      out.flags.push(value);
      
    }
  }

  return out;
}

export {parseARGV};
