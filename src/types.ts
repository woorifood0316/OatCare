export interface ScrollScene {
    id: string;
    chapter: string;
    title: string;
    body: string;
    tag: string;
    align: 'left' | 'right';
    startPercent: number;
    endPercent: number;
}

export interface ProductItem {
    flavor: string;
    tag: string;
    img: string;
    price: number;
    listPrice: number;
    lead?: boolean;
}

export interface BundleItem {
    name: string;
    desc: string;
    price: number;
    listPrice: number;
    img: string;
    highlight?: boolean;
}
