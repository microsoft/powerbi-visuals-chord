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

// https://stackoverflow.com/questions/62028169/how-to-detect-when-rotated-rectangles-are-colliding-each-other
// https://github.com/ArthurGerbelot/rect-collide
export function createRect(bbox: DOMRect, matrix: DOMMatrix, degrees: number) {
    const { topLeft, width, height } = getTransformedCorners(bbox, matrix);
    return new Rect({
        x: topLeft.x + width / 2,
        y: topLeft.y + height / 2,
        width: width,
        height: height,
        theta: null,
        angle: degrees,
    });
}

export function isRectCollide({
    rectElement,
    rectDegrees,
    onRectElement,
    onRectDegrees,
}: {
    rectElement: SVGGraphicsElement,
    rectDegrees: number,
    onRectElement: SVGGraphicsElement,
    onRectDegrees: number,
}): boolean {

    const rect = createRect(rectElement.getBBox(), rectElement.getCTM(), rectDegrees);
    const onRect = createRect(onRectElement.getBBox(), onRectElement.getCTM(), onRectDegrees);
    return isProjectionCollide(rect, onRect) && isProjectionCollide(onRect, rect);
}

export function isProjectionCollide (rect: Rect, onRect: Rect) {
  const lines = onRect.getAxis();
  const corners = rect.getCorners();

  let isCollide = true;

  lines.forEach((line, dimension) => {
    const futhers = {min:null, max:null};
    // Size of onRect half size on line direction
    const rectHalfSize = (dimension === 0 ? onRect.size.x : onRect.size.y) / 2;
    corners.forEach(corner => {
      const projected = corner.project(line);
      const CP = projected.minus(onRect.center);
      // Sign: Same directon of OnRect axis : true.
      const sign = (CP.x * line.direction.x) + (CP.y * line.direction.y) > 0;
      const signedDistance = CP.magnitude * (sign ? 1 : -1);

      if (!futhers.min || futhers.min.signedDistance > signedDistance) {
        futhers.min = {signedDistance, corner, projected};
      }
      if (!futhers.max || futhers.max.signedDistance < signedDistance) {
        futhers.max = {signedDistance, corner, projected};
      }
    });

    if (!(futhers.min.signedDistance < 0 && futhers.max.signedDistance > 0
      || Math.abs(futhers.min.signedDistance) < rectHalfSize
      || Math.abs(futhers.max.signedDistance) < rectHalfSize)) {
        isCollide = false;
      }
  });

  return isCollide;
}

interface Point {
    x: number;
    y: number;
}

class Vector {
    x: number;
    y: number;

    constructor({ x, y }: Point) {
        this.x = x;
        this.y = y;
    }


    get magnitude(): number {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }

    add(factor: Vector) {
        return new Vector({
            x: this.x + factor.x,
            y: this.y + factor.y,
        })
    }

    minus(factor: Vector) {
        return new Vector({
            x: this.x - factor.x,
            y: this.y - factor.y,
        })
    }

    multiply(factor: number | Vector | Point) {
        const f = typeof factor === 'object'
            ? { x: 0, y: 0, ...factor }
            : { x: factor, y: factor }

        return new Vector({
            x: this.x * f.x,
            y: this.y * f.y,
        })
    }

    rotate(theta: number) {
        return new Vector({
            x: this.x * Math.cos(theta) - this.y * Math.sin(theta),
            y: this.x * Math.sin(theta) + this.y * Math.cos(theta),
        })
    }

    project(line: Line) {
        const dotvalue = line.direction.x * (this.x - line.origin.x)
            + line.direction.y * (this.y - line.origin.y);

        return new Vector({
            x: line.origin.x + line.direction.x * dotvalue,
            y: line.origin.y + line.direction.y * dotvalue,
        })
    }
}

class Line {
    origin: Vector;
    direction: Vector;

    constructor({ x, y, dx, dy }: { x: number, y: number, dx: number, dy: number }) {
        this.origin = new Vector({ x, y });
        this.direction = new Vector({ x: dx, y: dy });
    }
}

class Rect {
    center: Vector;
    size: Vector;
    theta: number;

    constructor({
        x,
        y,
        width,
        height,
        theta = null,
        angle = 0,
    }: {
        x: number,
        y: number,
        width: number,
        height: number,
        theta?: number,
        angle?: number
    }) {
        this.center = new Vector({ x, y });
        this.size = new Vector({ x: width, y: height });
        this.theta = theta || toRadians(angle);
    }

    getAxis() {
        const OX = new Vector({ x: 1, y: 0 });
        const OY = new Vector({ x: 0, y: 1 });
        const RX = OX.rotate(this.theta);
        const RY = OY.rotate(this.theta);
        return [
            new Line({ ...this.center, dx: RX.x, dy: RX.y }),
            new Line({ ...this.center, dx: RY.x, dy: RY.y }),
        ];
    }

    getCorners() {
        const axis = this.getAxis();
        const RX = axis[0].direction.multiply(this.size.x / 2);
        const RY = axis[1].direction.multiply(this.size.y / 2);
        return [
            this.center.add(RX).add(RY),
            this.center.add(RX).add(RY.multiply(-1)),
            this.center.add(RX.multiply(-1)).add(RY.multiply(-1)),
            this.center.add(RX.multiply(-1)).add(RY),
        ]
    }
}


function transformPoint(point: Point, matrix: DOMMatrix) {
    const myMatrix: number[][] = [
        [matrix.a, matrix.c, matrix.e],
        [matrix.b, matrix.d, matrix.f],
        [0, 0, 1],
    ];
    const vector = [point.x, point.y, 1];
    const multiplicationResult = myMatrix.map((row) =>
        row.reduce((acc, value, index) => acc + value * vector[index], 0)
    );

    return { x: multiplicationResult[0], y: multiplicationResult[1] };
}

export function getTransformedCorners(bbox: DOMRect, matrix: DOMMatrix) {
    let topLeft: Point = {
        x: bbox.x,
        y: bbox.y,
    };

    let topRight: Point = {
        x: bbox.x + bbox.width,
        y: bbox.y,
    };

    let bottomRight: Point = {
        x: bbox.x + bbox.width,
        y: bbox.y + bbox.height,
    };

    let bottomLeft: Point = {
        x: bbox.x,
        y: bbox.y + bbox.height,
    };

    topLeft = transformPoint(topLeft, matrix);
    topRight = transformPoint(topRight, matrix);
    bottomRight = transformPoint(bottomRight, matrix);
    bottomLeft = transformPoint(bottomLeft, matrix);

    function calculateDistance(point1: Point, point2: Point): number {
        return Math.floor(Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)));
    }

    const width = calculateDistance(topLeft, topRight);
    const height = calculateDistance(topLeft, bottomLeft);

    return {
        topLeft,
        topRight,
        bottomRight,
        bottomLeft,
        width,
        height,
    }
}

function toRadians(degrees: number) {
    return degrees * Math.PI / 180;
}
