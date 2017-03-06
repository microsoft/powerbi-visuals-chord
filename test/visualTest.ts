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

/// <reference path="_references.ts"/>

module powerbi.extensibility.visual.test {
    // d3
    import ChordGroup = d3.layout.chord.Group;

    // powerbi.extensibility.visual.test
    import ChordChartData = powerbi.extensibility.visual.test.ChordChartData;
    import ChordChartBuilder = powerbi.extensibility.visual.test.ChordChartBuilder;
    import areColorsEqual = powerbi.extensibility.visual.test.helpers.areColorsEqual;
    import IsInRangeFunction = powerbi.extensibility.visual.test.helpers.IsInRangeFunction;
    import getRandomUniqueHexColors = powerbi.extensibility.visual.test.helpers.getRandomUniqueHexColors;
    import isSomeTextElementOverlapped = powerbi.extensibility.visual.test.helpers.isSomeTextElementOverlapped;
    import isTextElementInOrOutElement = powerbi.extensibility.visual.test.helpers.isTextElementInOrOutElement;
    import getSolidColorStructuralObject = powerbi.extensibility.visual.test.helpers.getSolidColorStructuralObject;

    // powerbi.extensibility.utils.test
    import assertColorsMatch = powerbi.extensibility.utils.test.helpers.color.assertColorsMatch;

    // ChordChart1444757060245
    import VisualClass = powerbi.extensibility.visual.ChordChart1444757060245.ChordChart;
    import ChordChartDataInterface = powerbi.extensibility.visual.ChordChart1444757060245.ChordChartData;

    describe("ChordChart", () => {
        let visualBuilder: ChordChartBuilder,
            defaultDataViewBuilder: ChordChartData,
            dataView: DataView;

        beforeEach(() => {
            visualBuilder = new ChordChartBuilder(1000, 500);
            defaultDataViewBuilder = new ChordChartData();

            dataView = defaultDataViewBuilder.getDataView();
        });

        describe("DOM tests", () => {
            it("svg element created", () => {
                expect(visualBuilder.mainElement[0]).toBeInDOM();
            });

            it("update", (done) => {
                visualBuilder.updateRenderTimeout(dataView, () => {
                    const valuesLength: number = _.sum(dataView
                        .categorical
                        .values
                        .map((column: DataViewValueColumn) => {
                            return column.values.filter(_.isNumber).length;
                        }));

                    const categoriesLength: number = dataView.categorical.values.length
                        + dataView.categorical.categories[0].values.length;

                    expect(visualBuilder.mainElement.children("g.chords").children("path").length)
                        .toBe(valuesLength);

                    expect(visualBuilder.mainElement.children("g.ticks").children("g.slice-ticks").length)
                        .toBe(categoriesLength);

                    expect(visualBuilder.mainElement.children("g.slices").children("path.slice").length)
                        .toBe(categoriesLength);

                    expect(visualBuilder.element.find(".chordChart").attr("height"))
                        .toBe(visualBuilder.viewport.height.toString());

                    expect(visualBuilder.element.find(".chordChart").attr("width"))
                        .toBe(visualBuilder.viewport.width.toString());

                    done();
                });
            });

            it("labels shouldn't be overlapped", (done) => {
                dataView.metadata.objects = {
                    labels: {
                        show: true,
                        fontSize: 40
                    }
                };

                visualBuilder.viewport.height = 100;
                visualBuilder.viewport.width = 1000;

                visualBuilder.updateRenderTimeout(dataView, () => {
                    const isInRange: IsInRangeFunction = (
                        value: number,
                        min: number,
                        max: number) => {

                        return value >= min && value <= max;
                    };

                    expect(isSomeTextElementOverlapped(
                        visualBuilder.dataLabels.toArray(),
                        isInRange)).toBeFalsy();

                    done();
                }, 50);
            });

            it("shouldn't throw any unexpected exceptions when category value is null", (done) => {

                defaultDataViewBuilder.valuesCategoryGroup[5][0] = null;
                expect(() => {
                    VisualClass.converter(
                        defaultDataViewBuilder.getDataView(),
                        visualBuilder.visualHost,
                        visualBuilder.visualHost.colorPalette,
                        false);
                }).not.toThrow();

                done();
            });

            it("labels shouldn't be cut off", (done) => {
                visualBuilder.viewport.height = 200;
                visualBuilder.viewport.width = 200;

                defaultDataViewBuilder.valuesValue = _.range(1, defaultDataViewBuilder.valuesCategoryGroup.length);

                dataView = defaultDataViewBuilder.getDataView();

                dataView.metadata.objects = {
                    labels: {
                        show: true
                    }
                };

                visualBuilder.updateRenderTimeout(dataView, () => {
                    expect(visualBuilder.mainElement.children("g.labels")[0].getBoundingClientRect().left)
                        .toBeGreaterThan(0);

                    visualBuilder.dataLabels
                        .toArray()
                        .forEach((element: Element) => {
                            expect(isTextElementInOrOutElement(
                                visualBuilder.mainElement[0],
                                element,
                                (firstValue: number, secondValue: number) => firstValue >= secondValue)).toBeTruthy();
                        });

                    done();
                });
            });

            it("labels shouldn't be visible on right side", (done) => {
                visualBuilder.viewport.height = 500;
                visualBuilder.viewport.width = 500;

                defaultDataViewBuilder.valuesCategoryGroup = _.range(20).map((value: number) => {
                    return [
                        value + "xxxxxxxxxxx",
                        value + "yyyyyyyyyyyyyy"
                    ];
                });

                defaultDataViewBuilder.valuesValue =
                    _.range(1, defaultDataViewBuilder.valuesCategoryGroup.length);

                dataView = defaultDataViewBuilder.getDataView();

                dataView.metadata.objects = {
                    labels: {
                        show: true,
                        fontSize: 40
                    }
                };

                visualBuilder.updateRenderTimeout(dataView, () => {
                    const rightLabels: JQuery = visualBuilder.dataLabels
                        .filter((i: number, element: Element) => {
                            return parseFloat($(element).attr("x")) > 0;
                        });

                    expect(rightLabels).toBeInDOM();

                    done();
                });
            });
        });

        describe("Format settings test", () => {
            describe("Axis", () => {
                beforeEach(() => {
                    dataView.metadata.objects = {
                        axis: {
                            show: true
                        }
                    };
                });

                it("show", () => {
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.sliceTicks).toBeInDOM();

                    (dataView.metadata.objects as any).axis.show = false;
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.sliceTicks).not.toBeInDOM();
                });
            });

            describe("Labels", () => {
                beforeEach(() => {
                    dataView.metadata.objects = {
                        labels: {
                            show: true
                        }
                    };
                });

                it("show", () => {
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.dataLabels).toBeInDOM();

                    (dataView.metadata.objects as any).labels.show = false;
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.dataLabels).not.toBeInDOM();
                });

                it("color", () => {
                    const color: string = "#222222";

                    (dataView.metadata.objects as any).labels.color = getSolidColorStructuralObject(color);
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.dataLabels
                        .toArray()
                        .forEach((element: Element) => {
                            assertColorsMatch($(element).css("fill"), color);
                        });
                });

                it("font size", () => {
                    const fontSize: number = 22,
                        expectedFontSize: string = "29.3333px";

                    (dataView.metadata.objects as any).labels.fontSize = fontSize;
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.dataLabels
                        .toArray()
                        .forEach((element: Element) => {
                            expect($(element).css("font-size")).toBe(expectedFontSize);
                        });
                });
            });

            describe("Data colors", () => {
                it("default color", () => {
                    const color: string = "#222222";

                    dataView.metadata.objects = {
                        dataPoint: {
                            defaultColor: getSolidColorStructuralObject(color)
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.chords
                        .toArray()
                        .forEach((element: Element) => {
                            assertColorsMatch($(element).css("fill"), color);
                        });
                });

                it("colors", () => {
                    dataView.metadata.objects = {
                        dataPoint: {
                            showAllDataPoints: true
                        }
                    };

                    const category: DataViewCategoryColumn = dataView.categorical.categories[0],
                        colors: string[] = getRandomUniqueHexColors(category.values.length);

                    category.objects = [];

                    category.values.forEach((value: PrimitiveValue, index: number) => {
                        category.objects[index] = {
                            dataPoint: {
                                fill: getSolidColorStructuralObject(colors[index])
                            }
                        } as DataViewObjects;
                    });

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    const slices: JQuery[] = visualBuilder.slices.toArray().map($),
                        chords: JQuery[] = visualBuilder.chords.toArray().map($);

                    colors.forEach((color: string) => {
                        expect(doElementsUseColor(slices, color)).toBeTruthy();
                        expect(doElementsUseColor(chords, color)).toBeTruthy();
                    });
                });

                function doElementsUseColor(elements: JQuery[], color: string): boolean {
                    return elements.some((element: JQuery) => {
                        return areColorsEqual(element.css("fill"), color);
                    });
                }
            });
        });

        describe("copyArcDescriptorsWithoutNaNValues", () => {
            it("shouldn't throw any unexpected exceptions when argument is undefined", () => {
                expect(() => {
                    VisualClass.copyArcDescriptorsWithoutNaNValues(undefined);
                }).not.toThrow();
            });

            it("shouldn't throw any unexpected exceptions when argument is null", () => {
                expect(() => {
                    VisualClass.copyArcDescriptorsWithoutNaNValues(null);
                }).not.toThrow();
            });

            it("result of removeNaNValues shouldn't contain any NaN values", () => {
                const arcDescriptors: ChordGroup[] = VisualClass.copyArcDescriptorsWithoutNaNValues(
                    createArcDescriptorsWithNaN(5));

                arcDescriptorsShouldntContainNaNValues(arcDescriptors);
            });

            function createArcDescriptorsWithNaN(length: number) {
                const valueNaN: number = NaN,
                    arcDescriptors: ChordGroup[] = [];

                for (let i: number = 0; i < length; i++) {
                    arcDescriptors.push({
                        value: valueNaN,
                        startAngle: valueNaN,
                        endAngle: valueNaN,
                        index: valueNaN
                    });
                }

                return arcDescriptors;
            }

            it("groups shouldn't contain any NaN values", () => {
                let chordChartData: ChordChartDataInterface;

                defaultDataViewBuilder.valuesValue = defaultDataViewBuilder.valuesValue.map(() => {
                    return 0;
                });

                chordChartData = VisualClass.converter(
                    defaultDataViewBuilder.getDataView(),
                    visualBuilder.visualHost,
                    visualBuilder.visualHost.colorPalette,
                    false);

                arcDescriptorsShouldntContainNaNValues(chordChartData.groups);
            });

            function arcDescriptorsShouldntContainNaNValues(arcDescriptors: ChordGroup[]): void {
                arcDescriptors.forEach((arcDescriptor: ChordGroup) => {
                    for (let propertyName in arcDescriptor) {
                        if (_.isNumber(arcDescriptor[propertyName])) {
                            expect(isNaN(arcDescriptor[propertyName])).toBeFalsy();
                        }
                    }
                });
            }
        });
    });
}
