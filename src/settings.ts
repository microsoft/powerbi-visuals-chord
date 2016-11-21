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
    import dataLabelUtils = powerbi.visuals.dataLabelUtils;

    export class ChordChartSettings {
        public static get Default() {
            return new this();
        }

        public static parse(dataView: DataView, properties: any) {
            let settings = new this();
            if (!dataView || !dataView.metadata || !dataView.metadata.objects) {
                return settings;
            }

            _.each(properties, (settingsValues, objectKey) => {
                _.each(settingsValues, (propertiesValues, propKey) => {

                    let type = properties[propKey].type;
                    let getValueFn = this.getValueFnByType(type);
                    settings[objectKey][propKey] = getValueFn(
                        dataView.metadata.objects,
                        properties[objectKey][propKey],
                        settings[objectKey][propKey]);
                });
            });
            /*
            for (let objectKey of properties) {
                for (let propKey of capabilities.objects[objectKey].properties) {
                    if (!settings[objectKey] || !_.has(settings[objectKey], propKey)) {
                        continue;
                    }

                    let type = properties[propKey].type;
                    let getValueFn = this.getValueFnByType(type);
                    settings[objectKey][propKey] = getValueFn(
                        dataView.metadata.objects,
                        properties[objectKey][propKey],
                        settings[objectKey][propKey]);
                }
            }
            */

            return settings;
        }

        public static createEnumTypeFromEnum(type: any): IEnumType {
            let even: any = false;
            return createEnumType(Object.keys(type)
                .filter((key, i) => ((!!(i % 2)) === even && type[key] === key
                    && !void (even = !even)) || (!!(i % 2)) !== even)
                .map(x => <IEnumMember>{ value: x, displayName: x }));
        }

        private static getValueFnByType(type: any/*DataViewObjectPropertyTypeDescriptor*/) {
            switch (_.keys(type)[0]) {
                case "fill":
                    return DataViewObjects.getFillColor;
                default:
                    return DataViewObjects.getValue;
            }
        }
        /*
        public static enumerateObjectInstances(
            settings = new this(),
            options: EnumerateVisualObjectInstancesOptions): ObjectEnumerationBuilder {

            let enumeration = new ObjectEnumerationBuilder();
            let object = settings && settings[options.objectName];
            if (!object) {
                return enumeration;
            }

            let instance = <VisualObjectInstance>{
                objectName: options.objectName,
                selector: null,
                properties: {}
            };

            for (let key in object) {
                if (_.has(object, key)) {
                    instance.properties[key] = object[key];
                }
            }

            enumeration.pushInstance(instance);
            return enumeration;
        }
        */

        public originalSettings: ChordChartSettings;
        public createOriginalSettings(): void {
            this.originalSettings = _.cloneDeep(this);
        }

        //Default Settings
        public dataPoint = {
            defaultColor: null,
            showAllDataPoints: false
        };

        public axis = {
            show: true
        };

        public labels = {
            show: true,
            color: dataLabelUtils.defaultLabelColor,
            fontSize: dataLabelUtils.DefaultFontSizeInPt
        };
    }
}
