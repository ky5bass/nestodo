import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusToggleComponent } from './status-toggle.component';

describe('StatusToggleComponent', () => {
  let fixture: ComponentFixture<StatusToggleComponent>;
  let component: StatusToggleComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusToggleComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatusToggleComponent);
    component = fixture.componentInstance;
  });

  it('未完了状態でクリックすると完了への切り替えを通知する', () => {
    spyOn(component.toggle, 'emit');
    fixture.componentRef.setInput('isComplete', false);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(component.toggle.emit).toHaveBeenCalledWith(true);
  });

  it('完了状態でクリックすると未完了への切り替えを通知する', () => {
    spyOn(component.toggle, 'emit');
    fixture.componentRef.setInput('isComplete', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(component.toggle.emit).toHaveBeenCalledWith(false);
  });
});
