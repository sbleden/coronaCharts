import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Label } from 'ng2-charts';
import { ChartType, ChartDataSets, ChartOptions } from 'chart.js';
import { DayData } from './model/data';

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
  public barChartType: ChartType = 'bar';
  public barChartLegend = true;

  public dailyTotalData: ChartDataSets[] = [];
  public dailyNewCasesData: ChartDataSets[] = [];
  public dailyNewCasesPercData: ChartDataSets[] = [];
  public dailyDuplicateRate: ChartDataSets[] = [];
  public dailyLabels: Label[] = [];


  constructor(private httpClient: HttpClient) { }

  ngOnInit() {
    this.httpClient.get<DayData>('https://interactive.zeit.de/cronjobs/2020/corona/germany.json').subscribe(
      res => {
        this.handleResult(res);
      }
    );
  }

  handleResult(data: DayData) {
    let startDate = new Date(data.kreise.meta.historicalStats.start);
    let end = new Date(data.kreise.meta.historicalStats.end);
    let numDays = (end.getTime() - startDate.getTime()) / 1000 / 60 / 60 / 24;
    console.log("Number of Days is " + numDays);
    let days = this.calcDays(data, numDays);
    console.log("Sums per day " + days);
    this.showDayChart(startDate, days);
  }



  showDayChart(startDate: Date, days: number[]) {
    let newCases = [];
    let totalCases = [];
    let percNewCases = [];
    let duplicatedRate = [];

    let startDateToShow = this.calcStartDayToShow(days);
    startDate.setDate(startDate.getDate() + startDateToShow);
    for (let i = startDateToShow; i < days.length; i++) {
      startDate.setDate(startDate.getDate() + 1);
      this.dailyLabels.push(startDate.toLocaleDateString(undefined, {month: "numeric", day: "numeric"}));
      totalCases.push(days[i]);
      let newCasesOfDay = days[i] - days[i - 1];
      newCases.push(newCasesOfDay);
      percNewCases.push((newCasesOfDay / days[i - 1]) * 100)

      let halfOfCurrent = days[i] / 2;
      for (let k = i - 1; k >= 0; k--) {
        if (days[k] < halfOfCurrent) {
          let delta = days[k + 1] - days[k];
          let toReach = halfOfCurrent - days[k];
          duplicatedRate.push((i - k) + toReach / delta - 1);
          break;
        }
      }
    }
    this.dailyTotalData = [{
      data: totalCases, label: 'Fälle'
    }];
    this.dailyNewCasesData = [{
      data: newCases, label: 'Neue Fälle'
    }];
    this.dailyNewCasesPercData = [{
      data: percNewCases, label: 'Neue Fälle %'
    }];
    this.dailyDuplicateRate = [{
      data: duplicatedRate, label: 'Verdopplungsrate'
    }];
  }

  calcStartDayToShow(days: number[]): number {
    let startDateToShow = days.length - this.DAYS_TO_SHOW;
    if (startDateToShow < 1) {
      startDateToShow = 1;
    }
    return startDateToShow;
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
    return days;
  }
}
