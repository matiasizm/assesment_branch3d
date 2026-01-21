export type SupportType = 'Free' | 'Roller' | 'Pin' | 'Fixed';

export class Node {
    public readonly id: string;
    public readonly x: number;
    public support: SupportType;

    constructor(id: string, x: number, support: SupportType = 'Free') {
        this.id = id;
        this.x = x;
        this.support = support;
    }

    get isRestrainedY(): boolean {
        return this.support !== 'Free';
    }

    get isRestrainedRotation(): boolean {
        return this.support === 'Fixed';
    }

    get isRestrainedX(): boolean {
        return this.support === 'Pin' || this.support === 'Fixed';
    }

    clone(): Node {
        return new Node(this.id, this.x, this.support);
    }
}