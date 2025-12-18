export enum MoleStatus {
  IDLE = 'IDLE',
  UP = 'UP',
  WHACKED = 'WHACKED'
}

export interface MoleData {
  id: number;
  status: MoleStatus;
}

export enum GameDifficulty {
  EASY = 'EASY',
  HARD = 'HARD'
}

export interface GameConfig {
  minPeepTime: number;
  maxPeepTime: number;
}