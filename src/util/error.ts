/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

export default class BaseError<D = any> extends Error {
  readonly msg: string;
  #data?: D;
  constructor(...msg: any[]) {
    super();
    this.msg = msg.map(String).join(' ');
  }
  data(data: D): this {
    this.#data = data;
    return this;
  }
  protected format(data?: D): string | undefined {
    return data && JSON.stringify(data, null, 2);
  }
  get message() {
    const formatted = this.format(this.#data);
    let inserted = false;
    let { msg } = this;
    if (formatted !== undefined)
      msg = msg.replace(/\{\s*\}/, () => {
        inserted = true;
        return formatted;
      });
    // Append formatted data if not inserted in message
    if (!inserted && formatted !== undefined) {
      const subtitle = 'Additional data:';
      const divider = ''.padEnd(subtitle.length, '-');
      msg = [msg, divider, subtitle, divider, formatted].join('\n');
    }
    return msg;
  }
  throw(): never {
    throw this;
  }
  static throw(...msg: any[]): never {
    throw new this(...msg);
  }
}

export class NotImplementedError<D = any> extends BaseError<D> {}

export class LogicError<D = any> extends BaseError<D> {}

export interface ParseErrorScene {
  raw: string;
  position: number;
  length?: number;
}

export class DataParseError extends BaseError<ParseErrorScene | string> {}
