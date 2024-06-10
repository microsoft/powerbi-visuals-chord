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

// d3
import { select } from "d3-selection";
import { Chord, ChordGroup } from "d3-chord";

import powerbiVisualsApi from "powerbi-visuals-api";
import DataView = powerbiVisualsApi.DataView;
import DataViewValueColumn = powerbiVisualsApi.DataViewValueColumn;
import PrimitiveValue = powerbiVisualsApi.PrimitiveValue;
import DataViewCategoryColumn = powerbiVisualsApi.DataViewCategoryColumn;
import DataViewObjects = powerbiVisualsApi.DataViewObjects;

import { SelectableDataPoint, Behavior, HighlightedChord } from '../src/behavior';

// powerbi.extensibility.utils.test
import { assertColorsMatch } from "powerbi-visuals-utils-testutils";

import {
  ChordChart,
  ChordChartData as ChordChartDataInterface,
} from "../src/chordChart";

import { ChordChartData } from "./chordChartData";
import { ChordChartBuilder } from "./visualBuilder";
import {
  areColorsEqual,
  IsInRangeFunction,
  getRandomUniqueHexColors,
  isSomeTextElementOverlapped,
  isTextElementInOrOutElement,
  getSolidColorStructuralObject,
} from "./helpers/helpers";
import { isNumber, range } from '../src/utils';

import { ChordChartSettingsModel } from '../src/chordChartSettingsModel';
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";

describe("ChordChart", () => {
  let visualBuilder: ChordChartBuilder,
    defaultDataViewBuilder: ChordChartData,
    dataView: DataView,
    settings: ChordChartSettingsModel;

  beforeEach(() => {
    visualBuilder = new ChordChartBuilder(1000, 500);
    defaultDataViewBuilder = new ChordChartData();

    dataView = defaultDataViewBuilder.getDataView();
    settings = new FormattingSettingsService().populateFormattingSettingsModel(ChordChartSettingsModel, dataView);
  });

  describe("DOM tests", () => {
    it("svg element created", () => {
      expect(visualBuilder.mainElement).toBeTruthy();
    });

    it("update", (done) => {
      visualBuilder.updateRenderTimeout(dataView, () => {
        const valuesLength: number = dataView.categorical!.values!.map((column: DataViewValueColumn) => {
          const notEmptyValues: PrimitiveValue[] = column.values.filter(
            (value: any) => {
              return !isNaN(value) && value !== null;
            }
          );

          return notEmptyValues.length;
        }).reduce((a, b) => a + b, 0);

        const categoriesLength: number =
          dataView.categorical!.values!.length +
          dataView.categorical!.categories![0].values.length;

        expect(
          visualBuilder.mainElement
            .querySelector("g.chords")
            ?.querySelectorAll("path").length
        ).toBe(valuesLength);

        expect(
          visualBuilder.mainElement
            .querySelector("g.ticks")
            ?.querySelectorAll("g.slice-ticks").length
        ).toBe(categoriesLength);

        expect(
          visualBuilder.mainElement
            .querySelector("g.slices")
            ?.querySelectorAll("path.slice").length
        ).toBe(categoriesLength);

        expect(
          visualBuilder.element
            .querySelector(".chordChart")
            ?.getAttribute("height")
        ).toBe(visualBuilder.viewport.height.toString());

        expect(
          visualBuilder.element
            .querySelector(".chordChart")
            ?.getAttribute("width")
        ).toBe(visualBuilder.viewport.width.toString());

        done();
      });
    });

    it("labels shouldn't be overlapped", (done) => {
      dataView.metadata.objects = {
        labels: {
          show: true,
          fontSize: 40,
        },
      };

      visualBuilder.viewport.height = 100;
      visualBuilder.viewport.width = 1000;

      visualBuilder.updateRenderTimeout(
        dataView,
        () => {
          const isInRange: IsInRangeFunction = (
            value: number,
            min: number,
            max: number
          ) => {
            return value >= min && value <= max;
          };

          expect(
            isSomeTextElementOverlapped(
              Array.from(visualBuilder.dataLabels),
              isInRange
            )
          ).toBeFalsy();

          done();
        },
        50
      );
    });

    it("shouldn't throw any unexpected exceptions when category value is null", () => {
      // @ts-ignore
      defaultDataViewBuilder.valuesCategoryGroup[5][0] = null;
      expect(() => {
        ChordChart.CONVERTER(
          settings,
          defaultDataViewBuilder.getDataView(),
          visualBuilder.visualHost,
          visualBuilder.visualHost.colorPalette,
          null
        );
      }).not.toThrow();
    });

    it("labels shouldn't be cut off", (done) => {
      visualBuilder.viewport.height = 200;
      visualBuilder.viewport.width = 200;

      defaultDataViewBuilder.valuesValue = range(
        1,
        defaultDataViewBuilder.valuesCategoryGroup.length
      );

      dataView = defaultDataViewBuilder.getDataView();

      dataView.metadata.objects = {
        labels: {
          show: true,
        },
      };

      visualBuilder.updateRenderTimeout(dataView, () => {
        expect(
          visualBuilder.mainElement
            .querySelectorAll("g.labels")[0]
            .getBoundingClientRect().left
        ).toBeGreaterThan(0);

        Array.from(visualBuilder.dataLabels).forEach((element: Element) => {
          expect(
            isTextElementInOrOutElement(
              visualBuilder.mainElement.querySelectorAll("g.labels")[0],
              element,
              (firstValue: number, secondValue: number) =>
                firstValue >= secondValue
            )
          ).toBeTruthy();
        });

        done();
      });
    });

    it("labels shouldn't be visible on right side", (done) => {
      visualBuilder.viewport.height = 500;
      visualBuilder.viewport.width = 500;

      defaultDataViewBuilder.valuesCategoryGroup = range(20).map(
        (value: number) => {
          return [value + "xxxxxxxxxxx", value + "yyyyyyyyyyyyyy"];
        }
      );

      defaultDataViewBuilder.valuesValue = range(
        1,
        defaultDataViewBuilder.valuesCategoryGroup.length
      );

      dataView = defaultDataViewBuilder.getDataView();

      dataView.metadata.objects = {
        labels: {
          show: true,
          fontSize: 40,
        },
      };

      visualBuilder.updateRenderTimeout(dataView, () => {
        const rightLabels: SVGElement[] = Array.from(
          visualBuilder.dataLabels
        ).filter((element: SVGElement) => {
          return parseFloat(element.getAttribute("x") || "") > 0;
        });

        expect(rightLabels).toBeTruthy();
        expect(rightLabels.length).toBeGreaterThan(0);

        done();
      });
    });
  });

  describe("Format settings test", () => {
    describe("Axis", () => {
      beforeEach(() => {
        dataView.metadata.objects = {
          axis: {
            show: true,
          },
        };
      });

      it("show", () => {
        visualBuilder.updateFlushAllD3Transitions(dataView);

        expect(visualBuilder.sliceTicks).toBeTruthy();
        expect(visualBuilder.sliceTicks.length).toBeGreaterThan(0);

        (<any>dataView.metadata.objects).axis.show = false;
        visualBuilder.updateFlushAllD3Transitions(dataView);

        expect(visualBuilder.sliceTicks.length).toBe(0);
      });
    });

    describe("Labels", () => {
      beforeEach(() => {
        dataView.metadata.objects = {
          labels: {
            show: true,
          },
        };
      });

      it("show", () => {
        visualBuilder.updateFlushAllD3Transitions(dataView);

        expect(visualBuilder.dataLabels).toBeTruthy();
        expect(visualBuilder.dataLabels.length).toBeGreaterThan(0);

        (<any>dataView.metadata.objects).labels.show = false;
        visualBuilder.updateFlushAllD3Transitions(dataView);

        expect(visualBuilder.dataLabels.length).toBe(0);
      });

      it("color", () => {
        const color: string = "#222222";
        (<any>dataView.metadata.objects).labels.color =
          getSolidColorStructuralObject(color);
        visualBuilder.updateFlushAllD3Transitions(dataView);

        visualBuilder.dataLabels.forEach((element: Element) => {
          assertColorsMatch((<HTMLElement>element).style["fill"], color);
        });
      });

      it("font size", () => {
        const fontSize: number = 22,
          expectedFontSize: string = "29.3333px";

        (<any>dataView.metadata.objects).labels.fontSize = fontSize;
        visualBuilder.updateFlushAllD3Transitions(dataView);

        Array.from(visualBuilder.dataLabels).forEach((element: Element) => {
          expect((<HTMLElement>element).style["font-size"]).toBe(
            expectedFontSize
          );
        });
      });
    });

    describe("Data colors", () => {
      it("default color", () => {
        const color: string = "#222222";

        dataView.metadata.objects = {
          dataPoint: {
            defaultColor: getSolidColorStructuralObject(color),
          },
        };

        visualBuilder.updateFlushAllD3Transitions(dataView);

        Array.from(visualBuilder.chords).forEach((element: Element) => {
          assertColorsMatch((<HTMLElement>element).style["fill"], color);
        });
      });

      it("colors", () => {
        dataView.metadata.objects = {
          dataPoint: {
            showAllDataPoints: true,
          },
        };

        const category: DataViewCategoryColumn = dataView.categorical!.categories![0];
        const colors: string[] = getRandomUniqueHexColors(category.values.length);

        category.objects = [];

        category.values.forEach((value: PrimitiveValue, index: number) => {
          category.objects![index] = <DataViewObjects>{
            dataPoint: {
              fill: getSolidColorStructuralObject(colors[index]),
            },
          };
        });

        visualBuilder.updateFlushAllD3Transitions(dataView);

        const slices: SVGElement[] = Array.from(visualBuilder.slices),
          chords: SVGElement[] = Array.from(visualBuilder.chords);

        colors.forEach((color: string) => {
          expect(doElementsUseColor(slices, color)).toBeTruthy();
          expect(doElementsUseColor(chords, color)).toBeTruthy();
        });
      });

      function doElementsUseColor(
        elements: SVGElement[],
        color: string
      ): boolean {
        return elements.some((element: SVGElement) => {
          const fill = getComputedStyle(element).fill;
          return areColorsEqual(fill, color);
        });
      }
    });
  });

  describe("copyArcDescriptorsWithoutNaNValues", () => {
    it("shouldn't throw any unexpected exceptions when argument is undefined", () => {
      expect(() => {
        ChordChart.COPY_ARC_DESCRIPTORS_WITHOUT_NAN_VALUES(undefined);
      }).not.toThrow();
    });

    it("shouldn't throw any unexpected exceptions when argument is null", () => {
      expect(() => {
        ChordChart.COPY_ARC_DESCRIPTORS_WITHOUT_NAN_VALUES(null);
      }).not.toThrow();
    });

    it("result of removeNaNValues shouldn't contain any NaN values", () => {
      const arcDescriptors: ChordGroup[] =
        ChordChart.COPY_ARC_DESCRIPTORS_WITHOUT_NAN_VALUES(
          createArcDescriptorsWithNaN(5)
        );

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
          index: valueNaN,
        });
      }

      return arcDescriptors;
    }

    it("groups shouldn't contain any NaN values", () => {
      let chordChartData: ChordChartDataInterface;

      defaultDataViewBuilder.valuesValue =
        defaultDataViewBuilder.valuesValue.map(() => {
          return 0;
        });

      chordChartData = ChordChart.CONVERTER(
        settings,
        defaultDataViewBuilder.getDataView(),
        visualBuilder.visualHost,
        visualBuilder.visualHost.colorPalette,
        null
      );

      arcDescriptorsShouldntContainNaNValues(chordChartData.groups);
    });

    function arcDescriptorsShouldntContainNaNValues(
      arcDescriptors: ChordGroup[]
    ): void {
      arcDescriptors.forEach((arcDescriptor: ChordGroup) => {
        for (let propertyName of Object.keys(arcDescriptor)) {
          if (isNumber(arcDescriptor[propertyName])) {
            expect(isNaN(arcDescriptor[propertyName])).toBeFalsy();
          }
        }
      });
    }
  });

  describe("check if values absent", () => {
    it("shouldn't throw any unexpected exceptions when Values field is undefined", () => {
      expect(() => {
        let chordChartData: ChordChartDataInterface = ChordChart.CONVERTER(
          settings,
          defaultDataViewBuilder.getDataView(undefined, true),
          visualBuilder.visualHost,
          visualBuilder.visualHost.colorPalette,
          null
        );
      }).not.toThrow();
    });
  });

  describe("Capabilities tests", () => {
    it("all items having displayName should have displayNameKey property", async () => {
      let r = await fetch("base/capabilities.json");
      let jsonData = await r.json();

      let objectsChecker: Function = (obj) => {
        for (let property of Object.keys(obj)) {
          let value: any = obj[property];

          if (value.displayName) {
            expect(value.displayNameKey).toBeDefined();
          }

          if (typeof value === "object") {
            objectsChecker(value);
          }
        }
      };

      objectsChecker(jsonData);
    });
  });

  describe("Selection", () => {
    it("datapoint should be selected on click", (done) => {
      visualBuilder.updateRenderTimeout(dataView, () => {
        const randomIndex: number = Math.floor(Math.random() * visualBuilder.slices.length);
        const element: SVGElement = visualBuilder.slices[randomIndex];

        const { datum, opacity } = getDatumAndOpacity(element);

        element.dispatchEvent(new MouseEvent("click"));
        expect(datum.selected).toBeTrue();
        expect(opacity).toBe(Behavior.FullOpacity);

        done();
      });
    })

    it("multiple datapoints should be selected on click", (done) => {
      visualBuilder.updateRenderTimeout(dataView, () => {
        testClickEvent({ ctrlKey: true });
        testClickEvent({ metaKey: true });
        testClickEvent({ shiftKey: true });

        done();
      });

    })

    it("clicking on single datapoint makes other style with dimmed opacity", (done) => {
      visualBuilder.updateRenderTimeout(dataView, () => {
        const randomIndex = Math.floor(Math.random() * visualBuilder.slices.length);
        const element: SVGElement = visualBuilder.slices[randomIndex];

        element.dispatchEvent(new MouseEvent("click"));
        const randomElementOpacity: number = parseFloat(getComputedStyle(element).opacity);
        expect(randomElementOpacity).toBe(Behavior.FullOpacity);

        for (let i = 0; i < visualBuilder.slices.length; i++) {
          if (i === randomIndex) continue;

          const opacity: number = parseFloat(getComputedStyle(visualBuilder.slices[i]).opacity);
          expect(opacity).toBe(Behavior.DimmedOpacity);
        }

        done();
      });
    })

    it("clicking on empty space should clear selection", (done) => {
      visualBuilder.updateRenderTimeout(dataView, () => {
        const randomIndex = Math.floor(Math.random() * visualBuilder.slices.length);
        const element: SVGElement = visualBuilder.slices[randomIndex];
        const svg: SVGElement = visualBuilder.svg;
        const datum: SelectableDataPoint = <SelectableDataPoint>select(element).datum();;

        expect(datum.selected).toBeFalse();
        element.dispatchEvent(new MouseEvent("click"));
        expect(datum.selected).toBeTrue();
        svg.dispatchEvent(new MouseEvent("click"));

        for (let i = 0; i < visualBuilder.slices.length; i++) {
          const { datum: dataPoint, opacity } = getDatumAndOpacity(visualBuilder.slices[i]);
          expect(dataPoint.selected).toBeFalse();
          expect(opacity).toBe(Behavior.FullOpacity);
        }

        done();
      });
    })

    function testClickEvent(eventInitDict: MouseEventInit) {
      const firstRandomIndex: number = Math.floor(Math.random() * visualBuilder.slices.length);
      let secondRandomIndex: number = Math.floor(Math.random() * visualBuilder.slices.length);
      if (firstRandomIndex === secondRandomIndex) {
        secondRandomIndex = (secondRandomIndex + 1) % visualBuilder.slices.length;
      }

      const firstElement: SVGElement = visualBuilder.slices[firstRandomIndex];
      const secondElement: SVGElement = visualBuilder.slices[secondRandomIndex];

      firstElement.dispatchEvent(new MouseEvent("click"));
      secondElement.dispatchEvent(new MouseEvent("click", eventInitDict));

      const { datum: firstDatum, opacity: firstOpacity } = getDatumAndOpacity(firstElement);
      const { datum: secondDatum, opacity: secondOpacity } = getDatumAndOpacity(secondElement);

      expect(firstDatum.selected).toBeTrue();
      expect(secondDatum.selected).toBeTrue();
      expect(firstOpacity).toBe(Behavior.FullOpacity);
      expect(firstOpacity).toBe(secondOpacity);

      for (let i = 0; i < visualBuilder.slices.length; i++) {
        if (i === firstRandomIndex || i === secondRandomIndex) {
          continue;
        }

        const element: SVGElement = visualBuilder.slices[i];
        const { datum, opacity } : { datum: SelectableDataPoint, opacity: number } = getDatumAndOpacity(element);

        expect(datum.selected).toBeFalse();
        expect(opacity).toBe(Behavior.DimmedOpacity);
      }
    }
  });

  describe("Accessibility", () => {
    describe("High contrast mode", () => {
      const backgroundColor: string = "#000000";
      const foregroundColor: string = "#ffff00";

      beforeEach(() => {
        visualBuilder.visualHost.colorPalette.isHighContrast = true;

        visualBuilder.visualHost.colorPalette.background = {
          value: backgroundColor,
        };
        visualBuilder.visualHost.colorPalette.foreground = {
          value: foregroundColor,
        };
      });

      it("should not use fill style", (done) => {
        visualBuilder.updateRenderTimeout(dataView, () => {
          const slices: SVGElement[] = Array.from(visualBuilder.slices);
          const chords: SVGElement[] = Array.from(visualBuilder.chords);

          expect(isColorAppliedToElements(slices, undefined, "fill"));
          expect(isColorAppliedToElements(chords, undefined, "fill"));

          done();
        });
      });

      it("should use stroke style", (done) => {
        visualBuilder.updateRenderTimeout(dataView, () => {
          const slices: SVGElement[] = Array.from(visualBuilder.slices);
          const chords: SVGElement[] = Array.from(visualBuilder.chords);

          expect(isColorAppliedToElements(slices, foregroundColor, "stroke"));
          expect(isColorAppliedToElements(chords, foregroundColor, "stroke"));

          done();
        });
      });

      function isColorAppliedToElements(
        elements: SVGElement[],
        color?: string,
        colorStyleName: string = "fill"
      ): boolean {
        return elements.some((element: SVGElement) => {
          const currentColor: string = element.style[colorStyleName];

          if (!currentColor || !color) {
            return currentColor === color;
          }

          return areColorsEqual(currentColor, color);
        });
      }
    });
  });
});

describe("ChordChart highlights", () => {
  let visualBuilder: ChordChartBuilder,
    defaultDataViewBuilder: ChordChartData,
    dataView: DataView;

  it("should highlight data points", (done) => {
    visualBuilder = new ChordChartBuilder(1000, 500);
    defaultDataViewBuilder = new ChordChartData();

    dataView = defaultDataViewBuilder.getDataView();

    if (!dataView?.categorical?.values) return;

    dataView.categorical.values[0].highlights = dataView.categorical.values[0].values;

    visualBuilder.updateRenderTimeout(dataView, () => {
      for (let i = 0; i < visualBuilder.chords.length; i++) {
        const chord: HighlightedChord = <HighlightedChord>select(visualBuilder.chords[i]).datum();
        const opacity: number = parseFloat(getComputedStyle(visualBuilder.chords[i]).opacity);

        if (chord.hasHighlight) {
          expect(opacity).toBe(Behavior.FullOpacity);
        } else {
          expect(opacity).toBe(Behavior.DimmedOpacity);
        }
      }

      done();
    })
  });
});


function getDatumAndOpacity(element: SVGElement) {
  const datum: SelectableDataPoint = <SelectableDataPoint>select(element).datum();
  const opacity: number = parseFloat(getComputedStyle(element).opacity);

  return { datum, opacity };
}