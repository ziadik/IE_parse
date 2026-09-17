// Тонкие обёртки над Buffer — чтобы не путаться с endian
class Reader {
  constructor(buffer, offset = 0) {
    this.buf = buffer;
    this.pos = offset;
  }
  u8() {
    const v = this.buf.readUInt8(this.pos);
    this.pos += 1;
    return v;
  }
  u16() {
    const v = this.buf.readUInt16LE(this.pos);
    this.pos += 2;
    return v;
  }
  u32() {
    const v = this.buf.readUInt32LE(this.pos);
    this.pos += 4;
    return v;
  }
  i16() {
    const v = this.buf.readInt16LE(this.pos);
    this.pos += 2;
    return v;
  }
  i32() {
    const v = this.buf.readInt32LE(this.pos);
    this.pos += 4;
    return v;
  }
  str(n) {
    const s = this.buf.toString("ascii", this.pos, this.pos + n);
    this.pos += n;
    return s;
  }
  resref() {
    return this.str(8).replace(/\0.*$/, "");
  }
  variable(n) {
    return this.str(n).replace(/\0.*$/, "");
  }
  seek(p) {
    this.pos = p;
  }
  skip(n) {
    this.pos += n;
  }
  slice(n) {
    const s = this.buf.slice(this.pos, this.pos + n);
    this.pos += n;
    return s;
  }
}

module.exports = { Reader };
