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
