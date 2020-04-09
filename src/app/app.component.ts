import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Label, Color } from 'ng2-charts';
import { ChartType, ChartDataSets, ChartOptions } from 'chart.js';
import { DayData, Stats, IntDayData, ChartData } from './model/data';
import { forkJoin } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';

interface Option {
  value: number;
  viewValue: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'app';

  options: Option[] = [
    { value: 3, viewValue: 'Fälle Aktiv' },
    { value: 0, viewValue: 'Fälle Gesamt' },
    { value: 2, viewValue: 'Genesen' },
    { value: 2, viewValue: 'Verstorben' }
  ];

  daysOptions: number[] = [15, 20, 25, 30, 40, 50];
  countries: string[] = ['Germany', 'Italy', 'Spain', 'France', 'US','United Kingdom','Switzerland','Norway'];

  public barChartOptions: ChartOptions = {
    responsive: true,
    // We use these empty structures as placeholders for dynamic theming.
    scales: {
      xAxes: [{}], yAxes: [{}]
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
    { backgroundColor: 'black' },
    { backgroundColor: 'orange' }
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
  public showCases = 0;
  public daysTohow = 15;
  public lastUpdate;
  public countriesForm = new FormControl();

  constructor(private httpClient: HttpClient) {
    this.countriesForm.setValue(['Germany']);
  }

  ngOnInit() {
    this.update();
  }

  optionChanged(event: any) {
    this.update();
  }

  optionCountryChanged(event: any) {
    this.update();
  }

  update() {
    let count = this.httpClient.get('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv', { responseType: 'text' });
    let deaths = this.httpClient.get('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv', { responseType: 'text' });
    let recovered = this.httpClient.get('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv', { responseType: 'text' });
    let germanData = this.httpClient.get<DayData>('https://interactive.zeit.de/cronjobs/2020/corona/germany.json');

    forkJoin(count, deaths, recovered, germanData).subscribe(responseList => {
      this.handleResult(responseList[3]);
      this.handleHoppinsData(responseList[0], responseList[1], responseList[2]);
    });
  }

  handleHoppinsData(count: string, deaths: string, recovered: string) {

    let dates = this.getDates(count);
    let countries = this.countriesForm.value;
    let datas = countries.map(c => this.createDataForCountry(count, deaths, recovered, c));
    this.showCartData(dates.endDate, this.daysTohow, datas);
  }

  private createDataForCountry(count: string, deaths: string, rescovered: string, country: string): ChartData {
    let dates = this.getDates(count);
    let days = [];
    if (this.showCases == 0) {
      days = this.handleTimeSeries(count, country);
    } else if (this.showCases == 1) {
      days = this.handleTimeSeries(deaths, country);
    } else if (this.showCases == 2) {
      days = this.handleTimeSeries(rescovered, country);
    } else if (this.showCases == 3) {
      let countArray = this.handleTimeSeries(count, country);
      let deathArray = this.handleTimeSeries(deaths, country);
      let recArray = this.handleTimeSeries(rescovered, country);
      for (let i = 0; i < countArray.length; i++) {
        days.push(countArray[i] - deathArray[i] - recArray[i]);
      }
    }
    return this.createChartData(dates.startDate, days, country);
  }

  getDates(csv: string): any {
    let lines = csv.split('\n');
    let headLine = lines[0].split(',');
    let startDateString = headLine[4];
    let startDate = new Date(startDateString);
    let endDateString = headLine[headLine.length - 1];
    let endDate = new Date(endDateString);
    return { startDate, endDate };
  }



  handleTimeSeries(csv: string, country: string): number[] {
    let lines = csv.split('\n');
    for (let line of lines) {
      let dataArray = line.split(',');
      if (dataArray[0] == '' && dataArray[1] == country) {
        return dataArray.slice(4).map(s => parseInt(s));
      }
    }
  }

  handleResult(gerDayData: DayData) {
    this.current = gerDayData.currentStats;
    this.lastUpdate = new Date(gerDayData.lastUpdate);
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
          duplicatedRate.push((i - k) - toReach / delta);
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
      this.dailyTotalData.push({
        data: datas[i].totalCases, label: datas[i].country
      });
      this.dailyNewCasesData.push({
        data: datas[i].newCasesData, label: datas[i].country
      });
      this.dailyNewCasesPercData.push({
        data: datas[i].newCasesPercData, label: datas[i].country
      });
      this.dailyDuplicateRate.push({
        data: datas[i].duplicateRate, label: datas[i].country
      });
    }
    this.show = true;
  }

  calcStartDayToShow(days: number[]): number {
    let startDateToShow = days.length - this.daysTohow;
    if (startDateToShow < 1) {
      startDateToShow = 1;
    }
    return startDateToShow;
  }

}
