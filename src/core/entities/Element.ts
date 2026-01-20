import { Node } from './Node';
import { StiffnessMatrix } from '../logic/StiffnessMatrix'; 

export class Element {
    public readonly id: string;
    public readonly startNode: Node;
    public readonly endNode: Node;
    public readonly E: number; 
    public readonly I: number; 

    constructor(
        id: string, 
        startNode: Node, 
        endNode: Node, 
        E: number, 
        I: number
    ) {
        this.id = id;
        this.startNode = startNode;
        this.endNode = endNode;
        this.E = E;
        this.I = I;
        
        if (this.length <= 1e-6) {
            throw new Error(`Element ${id} has zero length.`);
        }
    }

    get length(): number {
        const dx = this.endNode.x - this.startNode.x;
        return Math.abs(dx);
    }

    /**
     * Delega el cálculo a la librería lógica especializada.
     * Esto mantiene la entidad limpia.
     */
    get stiffnessMatrix(): number[][] {
        return StiffnessMatrix.beam2D(this.E, this.I, this.length);
    }
}