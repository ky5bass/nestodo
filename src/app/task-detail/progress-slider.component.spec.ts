import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgressSliderComponent } from './progress-slider.component';

describe('ProgressSliderComponent', () => {
  let fixture: ComponentFixture<ProgressSliderComponent>;
  let component: ProgressSliderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressSliderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressSliderComponent);
    component = fixture.componentInstance;
  });

  it('スライダー操作で0〜100の値を通知する', () => {
    spyOn(component.valueChange, 'emit');
    fixture.componentRef.setInput('value', 40);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '75';
    input.dispatchEvent(new Event('input'));

    expect(component.valueChange.emit).toHaveBeenCalledWith(75);
  });
});
