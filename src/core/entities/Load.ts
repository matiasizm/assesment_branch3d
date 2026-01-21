export type LoadType = 'PointForce' | 'DistributedForce' | 'PointMoment';

export type LoadCategory = 'Dead' | 'Live' | 'Wind' | 'Snow' | 'Seismic';

export interface LoadBase {
    id: string;
    type: LoadType;
    magnitude: number;
    category: LoadCategory; 
}

export class PointForceLoad implements LoadBase {
    public readonly id: string;
    public readonly type: LoadType = 'PointForce';
    public readonly magnitude: number;
    public readonly x: number;
    public readonly category: LoadCategory;

    constructor(id: string, magnitude: number, x: number, category: LoadCategory = 'Dead') {
        this.id = id;
        this.magnitude = magnitude;
        this.x = x;
        this.category = category;
    }
}

export class PointMomentLoad implements LoadBase {
    public readonly id: string;
    public readonly type: LoadType = 'PointMoment';
    public readonly magnitude: number;
    public readonly x: number;
    public readonly category: LoadCategory;

    constructor(id: string, magnitude: number, x: number, category: LoadCategory = 'Dead') {
        this.id = id;
        this.magnitude = magnitude;
        this.x = x;
        this.category = category;
    }
}

export class DistributedForceLoad implements LoadBase {
    public readonly id: string;
    public readonly type: LoadType = 'DistributedForce';
    public readonly magnitude: number;
    public readonly startX: number;
    public readonly endX: number;
    public readonly category: LoadCategory;

    constructor(id: string, magnitude: number, startX: number, endX: number, category: LoadCategory = 'Dead') {
        this.id = id;
        this.magnitude = magnitude;
        this.startX = startX;
        this.endX = endX;
        this.category = category;
    }
}

export type Load = PointForceLoad | PointMomentLoad | DistributedForceLoad;