import { Coord3d } from './types';

export const ACCEPTED_OBJECT_FILE_EXTENSIONS = ['stl'];

export const POSITION_0_0_0: Coord3d = {
    x: 0,
    y: 0,
    z: 0,
};

export const OBJECT_STATUS = {
    IN_SYNC: 'IN_SYNC',
    LOADING: 'LOADING',
    DELETED: 'DELETED',
};
