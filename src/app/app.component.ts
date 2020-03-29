import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Label, Color } from 'ng2-charts';
import { ChartType, ChartDataSets, ChartOptions } from 'chart.js';
import { DayData, Stats, IntDayData, ChartData } from './model/data';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'app';

  public DAYS_TO_SHOW = 15;
  public barChartOptions: ChartOptions = {
    responsive: true,
    // We use these empty structures as placeholders for dynamic theming.
    scales: {
      xAxes: [{}], yAxes: [{
        ticks: {
          min: 0
        }
      }]
    },
    plugins: {
      datalabels: {
        anchor: 'end',
        align: 'end',
      }
    }
  };

  public barChartColors: Color[] = [
    { backgroundColor: 'red' },
    { backgroundColor: 'green' },
    { backgroundColor: 'blue' },
    { backgroundColor: 'black' }
  ]

  public barChartType: ChartType = 'bar';
  public barChartLegend = true;

  public dailyTotalData: ChartDataSets[] = [{
    data: [], label: '.'
  }];
  public dailyNewCasesData: ChartDataSets[] = [{
    data: [], label: '.'
  }];
  public dailyNewCasesPercData: ChartDataSets[] = [{
    data: [], label: '.'
  }];
  public dailyDuplicateRate: ChartDataSets[] = [{
    data: [], label: '.'
  }];
  public dailyLabels: Label[] = [];
  public current: Stats;
  public show = false;

  constructor(private httpClient: HttpClient) {

  }

  ngOnInit() {
    let germanData = this.httpClient.get<DayData>('https://interactive.zeit.de/cronjobs/2020/corona/germany.json');
    let intData = this.httpClient.get<IntDayData>('https://interactive.zeit.de/cronjobs/2020/corona/international-chronoloy.json');

    forkJoin(germanData, intData).subscribe(
      responseList => {
        this.handleResult(responseList[0], responseList[1]);
      }
    );
  }

  handleResult(gerDayData: DayData, intDaydata: IntDayData) {

    let intEnd = new Date(intDaydata.lastDate);
    let gerEnd = new Date(gerDayData.kreise.meta.historicalStats.end);
    let offset = (gerEnd.getTime() - intEnd.getTime()) / 1000 / 60 / 60 / 24;

    let gerData = this.createGerChartData(gerDayData);
    let itData = this.createIntChartData(intDaydata, 'Italien', offset);
    let spainData = this.createIntChartData(intDaydata, 'Spanien', offset);
    let usData = this.createIntChartData(intDaydata, 'USA', offset);

    this.showCartData(gerEnd, this.DAYS_TO_SHOW, [gerData, itData, spainData, usData]);
  }

  createGerChartData(gerData: DayData): ChartData {
    this.current = gerData.currentStats;
    let startDate = new Date(gerData.kreise.meta.historicalStats.start);
    let end = new Date(gerData.kreise.meta.historicalStats.end);
    let numDays = (end.getTime() - startDate.getTime()) / 1000 / 60 / 60 / 24;
    let days = this.calcDays(gerData, numDays);
    return this.createChartData(startDate, days, 'Deutschland');
  }

  createIntChartData(intDatadata: IntDayData, country: string, offset: number): ChartData {
    let startDate = new Date(intDatadata.firstDate);
    let intEnd = new Date(intDatadata.lastDate);
    let numDays = (intEnd.getTime() - startDate.getTime()) / 1000 / 60 / 60 / 24;
    let days = this.calcDaysForCountry(intDatadata, numDays, country);
    while (offset > 0) {
      days.push(0);
      offset--;
    }
    return this.createChartData(startDate, days, country);
  }

  createChartData(startDate: Date, days: number[], country: string): ChartData {

    let newCases = [];
    let totalCases = [];
    let percNewCases = [];
    let duplicatedRate = [];

    let startDateToShow = this.calcStartDayToShow(days);
    startDate.setDate(startDate.getDate() + startDateToShow);
    for (let i = startDateToShow; i < days.length; i++) {
      startDate.setDate(startDate.getDate() + 1);
      totalCases.push(days[i]);
      let newCasesOfDay = days[i] - days[i - 1];
      newCases.push(newCasesOfDay);
      percNewCases.push((newCasesOfDay / days[i - 1]) * 100)

      let halfOfCurrent = days[i] / 2;
      for (let k = i - 1; k >= 0; k--) {
        if (days[k] < halfOfCurrent) {
          let delta = days[k + 1] - days[k];
          let toReach = halfOfCurrent - days[k];
          duplicatedRate.push((i - k) - toReach / delta + 1);
          break;
        }
      }
    }
    return {
      country, totalCases, newCasesData: newCases, newCasesPercData: percNewCases, duplicateRate: duplicatedRate
    };
  }

  showCartData(endDate: Date, numDays: number, datas: ChartData[]) {
    this.dailyLabels = []
    endDate.setDate(endDate.getDate() - numDays);
    for (let i = 0; i < numDays; i++) {
      endDate.setDate(endDate.getDate() + 1);
      this.dailyLabels.push(endDate.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }));
    }


    this.dailyTotalData = [];
    this.dailyNewCasesData = [];
    this.dailyNewCasesPercData = [];
    this.dailyDuplicateRate = [];
    for (let i = 0; i < datas.length; i++) {
      let hidden = datas[i].country != 'Deutschland';
      this.dailyTotalData.push({
        data: datas[i].totalCases, label: datas[i].country, hidden
      });
      this.dailyNewCasesData.push({
        data: datas[i].newCasesData, label: datas[i].country, hidden
      });
      this.dailyNewCasesPercData.push({
        data: datas[i].newCasesPercData, label: datas[i].country, hidden
      });
      this.dailyDuplicateRate.push({
        data: datas[i].duplicateRate, label: datas[i].country, hidden
      });
    }
    this.show = true;
  }

  calcStartDayToShow(days: number[]): number {
    let startDateToShow = days.length - this.DAYS_TO_SHOW;
    if (startDateToShow < 1) {
      startDateToShow = 1;
    }
    return startDateToShow;
  }

  calcDaysForCountry(data: IntDayData, numDays: number, countryToShow: string): number[] {
    for (let country of data.laender) {
      if (country.land == countryToShow) {
        return country.counts;
      }
    }
    return [];
  }

  calcDays(data: DayData, numDays: number): number[] {
    let days = [];
    for (let i = 0; i < numDays; i++) {
      let sum = 0;
      for (let kreis of data.kreise.items) {
        sum += kreis.historicalStats.count[i];
      }
      days.push(sum);
    }
    days.push(data.currentStats.count)
    return days;
  }
}
