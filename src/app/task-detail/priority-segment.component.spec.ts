import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrioritySegmentComponent } from './priority-segment.component';

describe('PrioritySegmentComponent', () => {
  let fixture: ComponentFixture<PrioritySegmentComponent>;
  let component: PrioritySegmentComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrioritySegmentComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PrioritySegmentComponent);
    component = fixture.componentInstance;
  });

  it('選択中の優先度をハイライトし、クリックした優先度を通知する', () => {
    spyOn(component.valueChange, 'emit');
    fixture.componentRef.setInput('value', 'priority');
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    ) as HTMLButtonElement[];
    expect(buttons[1].classList).toContain('active');

    buttons[2].click();

    expect(component.valueChange.emit).toHaveBeenCalledWith('highest');
  });
});
