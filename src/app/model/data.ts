export class DayData {
    kreise: Kreise;
    currentStats: Stats;
}

export class Day {
    date: string;
    count: number;
}

export class Kreise {
    items: Kreis[];
    meta: KreisMeta;
}

export class Kreis {
    ags: number;
    historicalStats: HistoricalKreisStats;
    currentStats: Stats;
}

export class KreisMeta {
    historicalStats: HistoricalStats;
}

export class Stats {
    count: number;
    recovered: number;
    dead: number;
}

export class HistoricalKreisStats {
    count: number;
}

export class HistoricalStats {
    start: string;
    end: string;
}

export class IntDayData {
    firstDate: string;
    lastDate: string;
    laender: IntCountryDayData[];
}

export class IntCountryDayData {
    land: string;
    counts: number[];
    deaths: number[];
}

export class ChartData {
    country: string;
    totalCases: number[];
    newCasesData: number[];
    newCasesPercData: number[];
    duplicateRate: number[]; 
}
