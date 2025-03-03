/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

const isObjectLike = (value: any): boolean => typeof value === "object" && value !== null;

function getTag(value: any): string {
    if (value == null) {
      return value === undefined ? '[object Undefined]' : '[object Null]'
    }
    return Object.prototype.toString.call(value)
  }

export const isEmpty = (obj: any): boolean => [Object, Array].includes((obj || {}).constructor) && !Object.entries((obj || {})).length;

export const isNumber = (value: any): boolean => typeof value === "number" || (isObjectLike(value) && getTag(value) === '[object Number]');

export function range(start: number, end?: number, step?: number, fromRight?: boolean): number[] {
  if (start != null && end == null && step == null && fromRight == null) {
    return Array.from({ length: start }, (_, index) => index);
  }

  let index = -1
  let length = Math.max(Math.ceil((end - start) / (step || 1)), 0)
  const result = new Array(length)

  while (length--) {
    result[fromRight ? length : ++index] = start
    start += step
  }
  return result
}

export function mapValues<T, TValue, TNewValue>(object: T, iteratee: (value: TValue, key: keyof T, obj: T) => TNewValue): { [P in keyof T]: TNewValue } {
  object = Object(object);
  const result = {} as { [P in keyof T]: TNewValue };

  Object.keys(object).forEach((key) => {
      const value: TValue = object[key];
      result[key] = iteratee(value, key as keyof T, object);
  });
  return result;
}

/**
 * Creates an object composed of the inverted keys and values of object. If object contains duplicate values, subsequent values overwrite property assignments of previous values.
 */
export function invert(input: any[]) {
  const result = {};

  for (const key of Object.keys(input)) {
    let value = input[key];
    if (value != null && typeof value.toString !== 'function') {
      value = Object.prototype.toString.call(value);
    }
    result[value] = key;
  }

  return result;
}
