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

module powerbi.extensibility.visual {
    import DataViewObjects = powerbi.DataViewObjects;
    import ColorHelper = powerbi.visuals.ColorHelper;

    export class ChordChartHelpers {
        public static interpolateArc(arc: d3.svg.Arc<any>): any {
            return function (data) {
                if (!this.oldData) {
                    this.oldData = data;
                    return () => arc(data);
                }

                let interpolation = d3.interpolate(this.oldData, data);
                this.oldData = interpolation(0);
                return (x) => arc(interpolation(x));
            };
        }

        public static addContext(context: any, fn: Function): any {
            return <any>function (...arg) {
                return fn.apply(context, [this].concat(_.toArray(arg)));
            };
        }

    }
}
