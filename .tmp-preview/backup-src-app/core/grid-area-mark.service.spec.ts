import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GridAreaIcon, GridAreaMark, GridAreaMarkService, publishGridAreaMark } from './grid-area-mark.service';

const HOURGLASS: GridAreaIcon = { path: '/hourglass_passing_time.svg', width: 32, height: 32 };
const WORLD_MAP: GridAreaIcon = { path: '/magnifying_glass_landscape_search.svg', width: 32, height: 32 };
const FACTIONS: GridAreaIcon = { path: '/factions.svg', width: 38, height: 38 };

const DAY_COUNTER_MARK: GridAreaMark = { title: () => ['The Realm of', 'The Test Realm'], icon: HOURGLASS };
const WORLD_MAP_MARK: GridAreaMark = { title: () => ['The Map'], icon: WORLD_MAP };
const FACTION_ROW_MARK: GridAreaMark = { title: () => ['Factions'], icon: FACTIONS };

@Component({ selector: 'cc-test-day-counter', standalone: true, template: '' })
class TestDayCounter {
  readonly mark = publishGridAreaMark('top-middle', 'day', DAY_COUNTER_MARK);
}

@Component({ selector: 'cc-test-world-map', standalone: true, template: '' })
class TestWorldMap {
  readonly mark = publishGridAreaMark('top-middle', 'map', WORLD_MAP_MARK);
}

@Component({ selector: 'cc-test-faction-row', standalone: true, template: '' })
class TestFactionRow {
  readonly mark = publishGridAreaMark('middle-left', 'content', FACTION_ROW_MARK);
}

describe('GridAreaMarkService', () => {
  let marks: GridAreaMarkService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    marks = TestBed.inject(GridAreaMarkService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('knows an area by the mark the panel standing in it published', () => {
    TestBed.createComponent(TestFactionRow);

    expect(marks.mark('middle-left')).toBe(FACTION_ROW_MARK);
    expect(marks.mark('middle-left')?.title()).toEqual(['Factions']);
    expect(marks.mark('middle-left')?.icon).toEqual(FACTIONS);
  });

  it('leaves an area with nothing published for it unmarked', () => {
    TestBed.createComponent(TestFactionRow);

    expect(marks.mark('bottom-right')).toBeNull();
  });

  it('wears the first panel\'s mark where two stand in one area, the other\'s once it goes', () => {
    const dayCounter = TestBed.createComponent(TestDayCounter);
    TestBed.createComponent(TestWorldMap);

    expect(marks.mark('top-middle')).toBe(DAY_COUNTER_MARK);

    dayCounter.destroy();

    expect(marks.mark('top-middle')).toBe(WORLD_MAP_MARK);
  });

  it('takes a mark off its area when the panel that published it goes', () => {
    const factionRow = TestBed.createComponent(TestFactionRow);
    expect(marks.mark('middle-left')).toBe(FACTION_ROW_MARK);

    factionRow.destroy();

    expect(marks.mark('middle-left')).toBeNull();
  });

  it('reports the board as one mark per area, holding unmarked areas out of it', () => {
    TestBed.createComponent(TestFactionRow);
    TestBed.createComponent(TestDayCounter);

    expect([...marks.marks().keys()].sort()).toEqual(['middle-left', 'top-middle']);
    expect(marks.marks().get('top-middle')).toBe(DAY_COUNTER_MARK);
  });
});
