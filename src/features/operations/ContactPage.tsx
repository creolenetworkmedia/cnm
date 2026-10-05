import {useLocale} from '../../shared/i18n'
import {SiteLink} from '../../app/router'
import {Icon} from '../../design/Icon'
import {InquiryForm} from './InquiryForm'
export function ContactPage(){const {t}=useLocale();return <div className="container standard-page"><header className="page-heading"><span className="eyebrow">CNM</span><h1>{t('contact')}</h1><p>{t('contactIntro')}</p></header><div className="contact-grid"><aside className="contact-aside"><h2>{t('emailUs')}</h2><a className="contact-address" href="mailto:creolenetworkmedia@gmail.com">creolenetworkmedia@gmail.com</a><div className="contact-shortcuts"><SiteLink to="/sponsor"><span>{t('partner')}</span><Icon name="arrow"/></SiteLink><SiteLink to="/submit-story"><span>{t('submitArticle')}</span><Icon name="arrow"/></SiteLink><SiteLink to="/community?form=song"><span>{t('requestSong')}</span><Icon name="arrow"/></SiteLink></div><p>{t('reviewNote')}</p></aside><InquiryForm/></div></div>}
